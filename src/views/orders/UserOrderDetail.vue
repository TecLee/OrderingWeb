<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderDetail } from '../../api/user-orders'
import type { Order } from '../../types'

const route = useRoute()
const router = useRouter()
const order = ref<Order | null>(null)
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

const statusSteps: string[] = ['pending', 'confirmed', 'cooking', 'completed']

onMounted(async () => {
  loading.value = true
  try {
    const res = await getOrderDetail(Number(route.params.id))
    order.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
})

function goBack() {
  router.push('/user/orders')
}
</script>

<template>
  <div class="detail-page" v-loading="loading">
    <el-button text @click="goBack" class="back-btn">&larr; 返回订单列表</el-button>

    <template v-if="order">
      <!-- Status banner -->
      <div v-if="order.status !== 'cancelled'" class="status-banner">
        <div class="status-steps">
          <div
            v-for="(step, i) in statusSteps"
            :key="step"
            class="step"
            :class="{
              active: statusSteps.indexOf(order.status) >= i,
              current: statusSteps.indexOf(order.status) === i,
            }"
          >
            <div class="step-dot" />
            <span class="step-label">{{ statusLabel[step] }}</span>
          </div>
        </div>
      </div>

      <div :class="['status-badge', statusClass[order.status]]">
        {{ statusLabel[order.status] }}
      </div>

      <!-- Order info -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">订单编号</span>
          <span class="info-value">#{{ order.id }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">下单时间</span>
          <span class="info-value">{{ order.created_at?.slice(0, 16).replace('T', ' ') }}</span>
        </div>
        <div class="info-row" v-if="order.note">
          <span class="info-label">备注</span>
          <span class="info-value">{{ order.note }}</span>
        </div>
      </div>

      <!-- Items -->
      <div class="items-card">
        <div v-for="item in order.items" :key="item.id" class="item-row">
          <div class="item-info">
            <span class="item-name">{{ item.dish_name }}</span>
            <span class="item-note" v-if="item.note">{{ item.note }}</span>
          </div>
          <div class="item-right">
            <span class="item-qty">x{{ item.quantity }}</span>
            <span class="item-price">&yen;{{ (item.unit_price * item.quantity).toFixed(2) }}</span>
          </div>
        </div>
        <div class="items-total">
          <span>合计</span>
          <span class="total-amount">&yen;{{ order.total_amount.toFixed(2) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 12px;
  color: #8a8f98;
}

.status-banner {
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 10px;
  padding: 20px 16px;
  margin-bottom: 12px;
}

.status-steps {
  display: flex;
  justify-content: space-between;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  position: relative;
}

.step::after {
  content: '';
  position: absolute;
  top: 6px;
  left: calc(50% + 10px);
  right: calc(-50% + 10px);
  height: 1px;
  background: #1e2026;
}

.step:last-child::after {
  display: none;
}

.step.active::after {
  background: #5e6ad2;
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1e2026;
  border: 2px solid #3a3d42;
  z-index: 1;
}

.step.active .step-dot {
  background: #5e6ad2;
  border-color: #5e6ad2;
}

.step.current .step-dot {
  box-shadow: 0 0 0 4px rgba(94, 106, 210, 0.2);
}

.step-label {
  font-size: 11px;
  color: #62666d;
}

.step.active .step-label {
  color: #8a8f98;
}

.step.current .step-label {
  color: #5e6ad2;
}

.status-badge {
  display: inline-block;
  font-size: 14px;
  padding: 4px 14px;
  border-radius: 12px;
  font-weight: 500;
  margin-bottom: 12px;
}

.st-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.st-confirmed { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.st-cooking { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.st-completed { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.st-cancelled { background: rgba(107, 114, 128, 0.15); color: #6b7280; }

.info-card {
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.info-label {
  color: #62666d;
  font-size: 13px;
}

.info-value {
  color: #f7f8f8;
  font-size: 13px;
}

.items-card {
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 10px;
  padding: 14px 16px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #1a1b1e;
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  color: #f7f8f8;
  font-size: 14px;
  font-weight: 500;
}

.item-note {
  color: #8a8f98;
  font-size: 12px;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-qty {
  color: #8a8f98;
  font-size: 13px;
}

.item-price {
  color: #f7f8f8;
  font-size: 14px;
  min-width: 60px;
  text-align: right;
}

.items-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #1e2026;
  color: #8a8f98;
  font-size: 14px;
}

.total-amount {
  color: #e5484d;
  font-size: 18px;
  font-weight: 600;
}
</style>
