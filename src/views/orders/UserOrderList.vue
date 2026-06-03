<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyOrders } from '../../api/user-orders'
import type { Order } from '../../types'

const router = useRouter()
const orders = ref<Order[]>([])
const loading = ref(false)

const statusLabel: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cooking: '制作中',
  completed: '已完成',
  cancelled: '已取消',
}

const statusClass: Record<string, string> = {
  pending: 'st-pending',
  confirmed: 'st-confirmed',
  cooking: 'st-cooking',
  completed: 'st-completed',
  cancelled: 'st-cancelled',
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await getMyOrders({ page_size: 50 })
    orders.value = res.data.items
  } catch { /* ignore */ }
  finally { loading.value = false }
})

function goDetail(id: number) {
  router.push(`/user/orders/${id}`)
}

function goMenu() {
  router.push('/user/menu')
}
</script>

<template>
  <div class="order-page" v-loading="loading">
    <h2 class="page-title">我的订单</h2>

    <div v-if="orders.length === 0">
      <el-empty description="暂无订单">
        <el-button type="primary" @click="goMenu">去点菜</el-button>
      </el-empty>
    </div>

    <div v-else class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-card" @click="goDetail(order.id)">
        <div class="order-header">
          <span class="order-id">#{{ order.id }}</span>
          <span :class="['order-status', statusClass[order.status]]">{{ statusLabel[order.status] }}</span>
        </div>
        <div class="order-items">
          <span v-for="item in order.items.slice(0, 3)" :key="item.id" class="order-item-name">
            {{ item.dish_name }} x{{ item.quantity }}
          </span>
          <span v-if="order.items.length > 3" class="order-item-more">等 {{ order.items.length }} 件</span>
        </div>
        <div class="order-footer">
          <span class="order-time">{{ order.created_at?.slice(0, 16).replace('T', ' ') }}</span>
          <span class="order-amount">&yen;{{ order.total_amount.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  color: #f7f8f8;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.order-card:hover {
  border-color: #3a3d42;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-id {
  color: #8a8f98;
  font-size: 13px;
}

.order-status {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.st-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.st-confirmed { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.st-cooking { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.st-completed { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.st-cancelled { background: rgba(107, 114, 128, 0.15); color: #6b7280; }

.order-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.order-item-name {
  color: #aeb3bb;
  font-size: 13px;
  background: #1a1b1e;
  padding: 2px 8px;
  border-radius: 4px;
}

.order-item-more {
  color: #62666d;
  font-size: 12px;
  padding: 2px 8px;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-time {
  color: #62666d;
  font-size: 12px;
}

.order-amount {
  color: #e5484d;
  font-size: 15px;
  font-weight: 600;
}
</style>
