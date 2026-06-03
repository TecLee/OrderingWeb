<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOrders, updateOrderStatus, getOrderDetail } from '../../api/admin-orders'
import type { Order, OrderStatus } from '../../types'

const orders = ref<Order[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref<string>('')
const detailVisible = ref(false)
const detailOrder = ref<Order | null>(null)
const detailLoading = ref(false)
const lockedOrders = reactive<Set<number>>(new Set())

const statusLabel: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cooking: '制作中',
  completed: '已完成',
  cancelled: '已取消',
}

const statusTagType: Record<string, string> = {
  pending: 'warning',
  confirmed: '',
  cooking: '',
  completed: 'success',
  cancelled: 'info',
}

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '制作中', value: 'cooking' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

onMounted(() => loadOrders())

async function loadOrders() {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await getOrders(params)
    orders.value = res.data.items
    total.value = res.data.total
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function handleStatusChange(order: Order, newStatus: string) {
  if (lockedOrders.has(order.id)) return  // throttle
  lockedOrders.add(order.id)
  try {
    await updateOrderStatus(order.id, newStatus)
    ElMessage.success('状态更新成功')
    loadOrders()
  } catch { /* ignore */ }
  finally {
    setTimeout(() => lockedOrders.delete(order.id), 1000)
  }
}

async function showDetail(orderId: number) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await getOrderDetail(orderId)
    detailOrder.value = res.data
  } catch { /* ignore */ }
  finally { detailLoading.value = false }
}

function statusNextList(status: OrderStatus): string[] {
  const map: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['cooking', 'cancelled'],
    cooking: ['completed'],
    completed: [],
    cancelled: [],
  }
  return map[status] || []
}

function onPageChange(p: number) {
  page.value = p
  loadOrders()
}

function onFilterChange() {
  page.value = 1
  loadOrders()
}
</script>

<template>
  <el-card>
    <div class="toolbar">
      <div class="filter-group">
        <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 130px;" @change="onFilterChange" clearable>
          <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
    </div>

    <div class="table-wrap">
      <el-table :data="orders" v-loading="loading" border stripe>
        <el-table-column prop="id" label="订单号" width="80" />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">{{ row.user_id }}</template>
        </el-table-column>
        <el-table-column label="菜品" min-width="160">
          <template #default="{ row }">
            <span v-for="item in row.items.slice(0, 2)" :key="item.id" class="item-tag">
              {{ item.dish_name }} x{{ item.quantity }}
            </span>
            <span v-if="row.items.length > 2" class="more-hint">等 {{ row.items.length }} 件</span>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">&yen;{{ row.total_amount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType[row.status]" size="small">{{ statusLabel[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="140">
          <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row.id)">详情</el-button>
            <el-dropdown v-if="statusNextList(row.status).length > 0" trigger="click" @command="(cmd: string) => handleStatusChange(row, cmd)">
              <el-button size="small" type="primary">更新状态</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="s in statusNextList(row.status)" :key="s" :command="s">
                    → {{ statusLabel[s] }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-pagination
      v-if="total > pageSize"
      v-model:current-page="page"
      :total="total"
      :page-size="pageSize"
      layout="total, prev, pager, next"
      @current-change="onPageChange"
      style="margin-top: 16px; justify-content: flex-end;"
    />

    <!-- Detail dialog -->
    <el-dialog v-model="detailVisible" title="订单详情" width="500px" class="detail-dialog">
      <div v-if="detailOrder" v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单号">#{{ detailOrder.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType[detailOrder.status]" size="small">{{ statusLabel[detailOrder.status] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">&yen;{{ detailOrder.total_amount.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ detailOrder.created_at?.slice(0, 16).replace('T', ' ') }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailOrder.note || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="color: #f7f8f8; margin: 16px 0 8px;">菜品明细</h4>
        <el-table :data="detailOrder.items" size="small" border>
          <el-table-column prop="dish_name" label="菜品" />
          <el-table-column prop="quantity" label="数量" width="60" />
          <el-table-column label="单价" width="80">
            <template #default="{ row }">&yen;{{ row.unit_price.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="小计" width="80">
            <template #default="{ row }">&yen;{{ (row.unit_price * row.quantity).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="note" label="备注" min-width="80" />
        </el-table>
      </div>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.table-wrap {
  overflow-x: auto;
}

.item-tag {
  display: inline-block;
  background: #1a1b1e;
  color: #aeb3bb;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 4px;
  margin-bottom: 2px;
}

.more-hint {
  color: #62666d;
  font-size: 12px;
}
</style>
