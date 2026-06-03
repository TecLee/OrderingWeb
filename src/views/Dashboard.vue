<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getStats } from '../api/admin-orders'
import type { OrderStats } from '../types'

const stats = ref<OrderStats | null>(null)
const loading = ref(false)
const hourlyChartRef = ref<HTMLElement>()
const topDishesChartRef = ref<HTMLElement>()
let hourlyChart: echarts.ECharts | null = null
let topDishesChart: echarts.ECharts | null = null

onMounted(async () => {
  loading.value = true
  try {
    const res = await getStats()
    stats.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
})

function initCharts() {
  if (!stats.value) return

  // Hourly distribution chart
  if (hourlyChartRef.value) {
    hourlyChart = echarts.init(hourlyChartRef.value)
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const data = hours.map(h => {
      const found = stats.value!.hourly_distribution.find(d => d.hour === h)
      return found ? found.count : 0
    })
    hourlyChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 16, bottom: 28 },
      xAxis: {
        type: 'category',
        data: hours.map(h => `${h}时`),
        axisLine: { lineStyle: { color: '#23252a' } },
        axisLabel: { color: '#62666d', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1a1b1e' } },
        axisLabel: { color: '#62666d', fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data,
        itemStyle: { color: '#5e6ad2', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#6b75e0' } },
      }],
    })
  }

  // Top dishes chart
  if (topDishesChartRef.value) {
    topDishesChart = echarts.init(topDishesChartRef.value)
    const items = stats.value.top_dishes
    topDishesChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 80, right: 16, top: 8, bottom: 8 },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1a1b1e' } },
        axisLabel: { color: '#62666d', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: items.map(i => i.dish_name).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#aeb3bb', fontSize: 12 },
      },
      series: [{
        type: 'bar',
        data: items.map(i => i.total_quantity).reverse(),
        itemStyle: { color: '#22c55e', borderRadius: [0, 4, 4, 0] },
        barWidth: 16,
      }],
    })
  }
}

// Watch for stats changes and init charts
import { watch } from 'vue'
watch(() => stats.value, (val) => {
  if (val) {
    setTimeout(() => initCharts(), 50)
  }
})

onUnmounted(() => {
  hourlyChart?.dispose()
  topDishesChart?.dispose()
})

function handleResize() {
  hourlyChart?.resize()
  topDishesChart?.resize()
}
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))
</script>

<template>
  <div v-loading="loading">
    <!-- Stats cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats?.today_orders ?? 0 }}</div>
        <div class="stat-label">今日订单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #f59e0b;">{{ stats?.pending_orders ?? 0 }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #22c55e;">{{ stats?.completed_orders ?? 0 }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats?.total_dishes ?? 0 }}</div>
        <div class="stat-label">菜品总数</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="chart-grid">
      <div class="chart-card">
        <h3 class="chart-title">今日订单时段分布</h3>
        <div ref="hourlyChartRef" class="chart-box" v-show="stats?.hourly_distribution.length"></div>
        <div v-if="!stats?.hourly_distribution.length" class="chart-empty">暂无数据</div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title">热销菜品 Top5</h3>
        <div ref="topDishesChartRef" class="chart-box" v-show="stats?.top_dishes.length"></div>
        <div v-if="!stats?.top_dishes.length" class="chart-empty">暂无数据</div>
      </div>
    </div>

    <!-- Status breakdown for today -->
    <div class="chart-card" style="margin-top: 16px;" v-if="stats?.status_breakdown">
      <h3 class="chart-title">今日订单状态分布</h3>
      <div class="status-bar">
        <div class="status-seg pending" :style="{ flex: stats.status_breakdown.pending || 0.1 }">
          {{ stats.status_breakdown.pending || 0 }} 待确认
        </div>
        <div class="status-seg confirmed" :style="{ flex: stats.status_breakdown.confirmed || 0.1 }">
          {{ stats.status_breakdown.confirmed || 0 }} 已确认
        </div>
        <div class="status-seg cooking" :style="{ flex: stats.status_breakdown.cooking || 0.1 }">
          {{ stats.status_breakdown.cooking || 0 }} 制作中
        </div>
        <div class="status-seg completed" :style="{ flex: stats.status_breakdown.completed || 0.1 }">
          {{ stats.status_breakdown.completed || 0 }} 已完成
        </div>
        <div class="status-seg cancelled" :style="{ flex: stats.status_breakdown.cancelled || 0.1 }">
          {{ stats.status_breakdown.cancelled || 0 }} 已取消
        </div>
      </div>
    </div>

    <!-- System overview -->
    <div class="chart-card" style="margin-top: 16px;">
      <h3 class="chart-title">系统概览</h3>
      <div class="overview-grid">
        <div class="overview-item">
          <span class="ov-label">菜品总数</span>
          <span class="ov-value">{{ stats?.total_dishes ?? 0 }}</span>
        </div>
        <div class="overview-item">
          <span class="ov-label">分类数量</span>
          <span class="ov-value">{{ stats?.total_categories ?? 0 }}</span>
        </div>
        <div class="overview-item">
          <span class="ov-label">用户数量</span>
          <span class="ov-value">{{ stats?.total_users ?? 0 }}</span>
        </div>
        <div class="overview-item">
          <span class="ov-label">今日订单</span>
          <span class="ov-value">{{ stats?.today_orders ?? 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  background: #0f1011;
  border: 1px solid #23252a;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 600;
  color: #5e6ad2;
  letter-spacing: -1px;
  line-height: 1.2;
}

.stat-label {
  color: #8a8f98;
  font-size: 13px;
  margin-top: 8px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: #0f1011;
  border: 1px solid #23252a;
  border-radius: 12px;
  padding: 16px;
}

.chart-title {
  color: #f7f8f8;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.chart-box {
  width: 100%;
  height: 200px;
}

.chart-empty {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3a3d42;
  font-size: 14px;
}

.status-bar {
  display: flex;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  gap: 2px;
}

.status-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  min-width: 0;
}

.status-seg.pending { background: #f59e0b; }
.status-seg.confirmed { background: #3b82f6; }
.status-seg.cooking { background: #8b5cf6; }
.status-seg.completed { background: #22c55e; }
.status-seg.cancelled { background: #6b7280; }

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: #1a1b1e;
  border-radius: 8px;
}

.ov-label {
  color: #62666d;
  font-size: 12px;
}

.ov-value {
  color: #f7f8f8;
  font-size: 22px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    padding: 16px 12px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .stat-grid {
    gap: 8px;
  }

  .stat-card {
    padding: 12px 8px;
    border-radius: 8px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 10px;
  }
}
</style>
