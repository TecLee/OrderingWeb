<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserCategories, getUserDishes } from '../../api/user-dishes'
import { useCartStore } from '../../stores/cart'
import type { Category, Dish } from '../../types'

const cartStore = useCartStore()
const categories = ref<Category[]>([])
const dishes = ref<Dish[]>([])
const activeCategory = ref<number | null>(null)
const loading = ref(false)
const addingDishes = reactive<Set<number>>(new Set())

const serverUrl = import.meta.env.VITE_SERVER_URL

onMounted(async () => {
  loading.value = true
  try {
    const [catRes, dishRes] = await Promise.all([
      getUserCategories(),
      getUserDishes({ page_size: 50 }),
    ])
    categories.value = catRes.data
    dishes.value = dishRes.data.items
  } catch { /* ignore */ }
  finally { loading.value = false }
})

const filteredDishes = computed(() => {
  if (activeCategory.value === null) return dishes.value
  return dishes.value.filter(d => d.category_id === activeCategory.value)
})

function selectCategory(id: number | null) {
  activeCategory.value = id
}

function getImageUrl(dish: Dish) {
  if (dish.image_url) {
    return dish.image_url.startsWith('http') ? dish.image_url : serverUrl + dish.image_url
  }
  return ''
}

async function handleAddToCart(dish: Dish) {
  if (addingDishes.has(dish.id)) return  // throttle: block rapid clicks
  addingDishes.add(dish.id)
  try {
    await cartStore.addToCart(dish.id, 1)
    ElMessage.success('已加入购物车')
  } catch { /* ignore */ }
  finally {
    setTimeout(() => addingDishes.delete(dish.id), 800)
  }
}
</script>

<template>
  <div class="menu-page" v-loading="loading">
    <!-- Category tabs -->
    <div class="category-tabs">
      <button
        :class="['cat-btn', { active: activeCategory === null }]"
        @click="selectCategory(null)"
      >全部</button>
      <button
        v-for="c in categories"
        :key="c.id"
        :class="['cat-btn', { active: activeCategory === c.id }]"
        @click="selectCategory(c.id)"
      >{{ c.name }}</button>
    </div>

    <!-- Dish grid -->
    <div v-if="filteredDishes.length > 0" class="dish-grid">
      <div v-for="dish in filteredDishes" :key="dish.id" class="dish-card">
        <div class="card-img" :style="getImageUrl(dish) ? { backgroundImage: `url(${getImageUrl(dish)})` } : {}">
          <div v-if="!getImageUrl(dish)" class="img-placeholder">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#3a3d42" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">{{ dish.name }}</div>
          <div class="card-desc">{{ dish.description || '暂无描述' }}</div>
          <div class="card-footer">
            <span class="card-price">&yen;{{ dish.price.toFixed(2) }}</span>
            <button class="add-btn" @click="handleAddToCart(dish)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <el-empty v-else description="暂无菜品" />
  </div>
</template>

<style scoped>
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.cat-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border: 1px solid #1e2026;
  border-radius: 20px;
  background: #0d0e10;
  color: #8a8f98;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.cat-btn:hover {
  color: #f7f8f8;
  border-color: #3a3d42;
}

.cat-btn.active {
  background: #5e6ad2;
  border-color: #5e6ad2;
  color: #fff;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 768px) {
  .dish-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .dish-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

.dish-card {
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.dish-card:hover {
  border-color: #3a3d42;
}

.card-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #1a1b1e center / cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-placeholder {
  opacity: 0.4;
}

.card-body {
  padding: 10px 12px;
}

.card-title {
  color: #f7f8f8;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-desc {
  color: #62666d;
  font-size: 12px;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-price {
  color: #e5484d;
  font-size: 15px;
  font-weight: 600;
}

.add-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #5e6ad2;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.add-btn:hover {
  background: #6b75e0;
}

.add-btn:active {
  transform: scale(0.95);
}
</style>
