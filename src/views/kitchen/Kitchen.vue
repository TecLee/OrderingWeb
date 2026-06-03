<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { getOrders, updateOrderStatus } from '../../api/admin-orders'
import { useAuthStore } from '../../stores/auth'
import type { Order } from '../../types'

const router = useRouter()
const authStore = useAuthStore()

const pendingOrders = ref<Order[]>([])
const cookingOrders = ref<Order[]>([])
const completedOrders = ref<Order[]>([])
const loading = ref(false)
const lastPendingCount = ref(0)
const newOrderAlert = ref(false)
const lockedOrders = reactive<Set<number>>(new Set())
const wsConnected = ref(false)

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/kitchen`

const statusLabel: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cooking: '制作中',
  completed: '已完成',
  cancelled: '已取消',
}

async function fetchOrders() {
  try {
    const res = await getOrders({ page_size: 100 })
    const all = res.data.items
    const newPending = all.filter((o: Order) => o.status === 'pending')

    if (newPending.length > lastPendingCount.value && lastPendingCount.value > 0) {
      newOrderAlert.value = true
      setTimeout(() => { newOrderAlert.value = false }, 3000)
    }
    lastPendingCount.value = newPending.length

    pendingOrders.value = newPending
    cookingOrders.value = all.filter((o: Order) => o.status === 'confirmed' || o.status === 'cooking')
    completedOrders.value = all.filter((o: Order) => o.status === 'completed')
  } catch { /* ignore */ }
}

async function changeStatus(order: Order, newStatus: string) {
  if (lockedOrders.has(order.id)) return
  lockedOrders.add(order.id)
  try {
    await updateOrderStatus(order.id, newStatus)
    fetchOrders()  // immediate refresh, WS will also trigger refresh
  } catch { /* ignore */ }
  finally {
    setTimeout(() => lockedOrders.delete(order.id), 1000)
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  return `${Math.floor(min / 60)}小时前`
}

function connectWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return

  ws = new WebSocket(WS_URL)
  ws.onopen = () => { wsConnected.value = true }
  ws.onclose = () => {
    wsConnected.value = false
    // Reconnect after 5 seconds
    reconnectTimer = setTimeout(connectWS, 5000)
  }
  ws.onerror = () => { ws?.close() }
  ws.onmessage = () => {
    // Order changed — refresh the board
    fetchOrders()
  }
}

function disconnectWS() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) { ws.onclose = null; ws.close(); ws = null }
  wsConnected.value = false
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    authStore.clearAuth()
    router.push('/login')
  } catch { /* cancelled */ }
}

onMounted(() => {
  fetchOrders()
  connectWS()
})

onUnmounted(() => {
  disconnectWS()
})
</script>

<template>
  <div class="kitchen-page">
    <header class="kitchen-header">
      <h1 class="kitchen-title">家庭私厨 · 厨房看板</h1>
      <div class="header-right">
        <span :class="['alert-dot', { on: newOrderAlert }]"></span>
        <span class="time-now">{{ new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
        <span class="header-divider"></span>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <div class="board" v-loading="loading">
      <!-- Column: Pending -->
      <div class="column col-pending">
        <div class="column-header">
          <span class="col-title">待确认</span>
          <span class="col-count">{{ pendingOrders.length }}</span>
        </div>
        <div class="column-list">
          <div v-for="order in pendingOrders" :key="order.id" class="order-card new-order">
            <div class="card-top">
              <span class="card-id">#{{ order.id }}</span>
              <span class="card-time">{{ timeAgo(order.created_at) }}</span>
            </div>
            <div class="card-items">
              <div v-for="item in order.items" :key="item.id" class="card-item">
                <span class="item-name">{{ item.dish_name }}</span>
                <span class="item-qty">x{{ item.quantity }}</span>
              </div>
            </div>
            <div v-if="order.note" class="card-note">📝 {{ order.note }}</div>
            <div class="card-actions">
              <button class="btn-confirm" @click="changeStatus(order, 'confirmed')">确认接单</button>
              <button class="btn-cancel" @click="changeStatus(order, 'cancelled')">取消</button>
            </div>
          </div>
          <div v-if="pendingOrders.length === 0" class="empty-col">
            <span class="empty-text">暂无待确认订单</span>
          </div>
        </div>
      </div>

      <!-- Column: Cooking -->
      <div class="column col-cooking">
        <div class="column-header">
          <span class="col-title">制作中</span>
          <span class="col-count">{{ cookingOrders.length }}</span>
        </div>
        <div class="column-list">
          <div v-for="order in cookingOrders" :key="order.id" class="order-card">
            <div class="card-top">
              <span class="card-id">#{{ order.id }}</span>
              <span :class="['card-status-tag', order.status === 'confirmed' ? 'tag-blue' : 'tag-purple']">
                {{ statusLabel[order.status] }}
              </span>
            </div>
            <div class="card-items">
              <div v-for="item in order.items" :key="item.id" class="card-item">
                <span class="item-name">{{ item.dish_name }}</span>
                <span class="item-qty">x{{ item.quantity }}</span>
              </div>
            </div>
            <div v-if="order.note" class="card-note">📝 {{ order.note }}</div>
            <div class="card-actions">
              <button v-if="order.status === 'confirmed'" class="btn-cook" @click="changeStatus(order, 'cooking')">开始制作</button>
              <button v-if="order.status === 'cooking'" class="btn-done" @click="changeStatus(order, 'completed')">完成出餐</button>
            </div>
          </div>
          <div v-if="cookingOrders.length === 0" class="empty-col">
            <span class="empty-text">暂无制作中的订单</span>
          </div>
        </div>
      </div>

      <!-- Column: Completed -->
      <div class="column col-completed">
        <div class="column-header">
          <span class="col-title">已完成</span>
          <span class="col-count">{{ completedOrders.length }}</span>
        </div>
        <div class="column-list">
          <div v-for="order in completedOrders" :key="order.id" class="order-card completed">
            <div class="card-top">
              <span class="card-id">#{{ order.id }}</span>
              <span class="card-time">{{ timeAgo(order.created_at) }}</span>
            </div>
            <div class="card-items">
              <div v-for="item in order.items.slice(0, 3)" :key="item.id" class="card-item">
                <span class="item-name">{{ item.dish_name }}</span>
                <span class="item-qty">x{{ item.quantity }}</span>
              </div>
              <span v-if="order.items.length > 3" class="more-items">等 {{ order.items.length }} 件</span>
            </div>
          </div>
          <div v-if="completedOrders.length === 0" class="empty-col">
            <span class="empty-text">暂无已完成的订单</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kitchen-page {
  min-height: 100vh;
  background: #010102;
  padding: 0;
}

.kitchen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: #0d0e10;
  border-bottom: 1px solid #1e2026;
  position: sticky;
  top: 0;
  z-index: 100;
}

.kitchen-title {
  color: #f7f8f8;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3a3d42;
  transition: all 0.3s;
}

.alert-dot.on {
  background: #e5484d;
  animation: pulse 0.5s ease-in-out 3;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(229, 72, 77, 0); }
}

.time-now {
  color: #8a8f98;
  font-size: 14px;
}

.header-divider {
  width: 1px;
  height: 20px;
  background: #1e2026;
}

.logout-btn {
  background: none;
  border: 1px solid #1e2026;
  color: #62666d;
  font-size: 13px;
  padding: 4px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.logout-btn:hover {
  color: #8a8f98;
  border-color: #3a3d42;
  background: #1a1b1e;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px;
  height: calc(100vh - 56px);
  overflow: hidden;
}

@media (max-width: 768px) {
  .board {
    grid-template-columns: 1fr;
    overflow-y: auto;
    height: auto;
  }
}

.column {
  display: flex;
  flex-direction: column;
  background: #0a0b0c;
  border: 1px solid #1e2026;
  border-radius: 10px;
  overflow: hidden;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #1e2026;
  flex-shrink: 0;
}

.col-title {
  color: #f7f8f8;
  font-size: 15px;
  font-weight: 600;
}

.col-count {
  background: #1e2026;
  color: #8a8f98;
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 10px;
}

.column-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-card {
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 8px;
  padding: 12px;
}

.col-pending .order-card {
  border-left: 3px solid #f59e0b;
}

.col-cooking .order-card {
  border-left: 3px solid #8b5cf6;
}

.col-completed .order-card {
  opacity: 0.6;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-id {
  color: #8a8f98;
  font-size: 13px;
  font-weight: 500;
}

.card-time {
  color: #62666d;
  font-size: 12px;
}

.card-status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
}

.tag-blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.tag-purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

.card-items {
  margin-bottom: 10px;
}

.card-item {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
}

.item-name {
  color: #f7f8f8;
  font-size: 15px;
  font-weight: 500;
}

.item-qty {
  color: #8a8f98;
  font-size: 14px;
  font-weight: 600;
}

.more-items {
  color: #62666d;
  font-size: 12px;
}

.card-note {
  color: #f59e0b;
  font-size: 13px;
  background: rgba(245, 158, 11, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.card-actions button:hover {
  opacity: 0.85;
}

.btn-confirm {
  background: #f59e0b;
  color: #000;
}

.btn-cancel {
  background: #1e2026;
  color: #8a8f98;
}

.btn-cook {
  background: #8b5cf6;
  color: #fff;
}

.btn-done {
  background: #22c55e;
  color: #000;
}

.empty-col {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
}

.empty-text {
  color: #3a3d42;
  font-size: 14px;
}
</style>
