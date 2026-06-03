<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { getDishes, deleteDish } from '../../api/dishes'
import { getCategories } from '../../api/categories'
import type { Dish, Category } from '../../types'

const router = useRouter()
const serverUrl = import.meta.env.VITE_SERVER_URL
const dishes = ref<Dish[]>([])
const categories = ref<Category[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const categoryId = ref<number | undefined>()
const loading = ref(false)

onMounted(() => { loadCategories(); loadDishes() })

async function loadCategories() {
  try {
    const res = await getCategories()
    categories.value = res.data
  } catch { /* ignore */ }
}

async function loadDishes() {
  loading.value = true
  try {
    const res = await getDishes({
      keyword: keyword.value || undefined,
      category_id: categoryId.value,
      page: page.value,
      page_size: pageSize.value,
    })
    dishes.value = res.data.items
    total.value = res.data.total
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function onSearch() {
  page.value = 1
  loadDishes()
}

function onPageChange(p: number) {
  page.value = p
  loadDishes()
}

function goAdd() { router.push('/dishes/add') }
function goEdit(id: number) { router.push(`/dishes/${id}/edit`) }

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这个菜品吗？', '提示', { type: 'warning' })
    await deleteDish(id)
    loadDishes()
  } catch { /* cancelled */ }
}
</script>

<template>
  <el-card>
    <div class="toolbar">
      <div class="search-group">
        <el-input v-model="keyword" placeholder="搜索菜品名称" clearable class="search-input" @clear="onSearch" @keyup.enter="onSearch" />
        <el-select v-model="categoryId" placeholder="全部分类" clearable class="category-select" @change="onSearch">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" @click="onSearch">搜索</el-button>
      </div>
      <el-button type="primary" class="add-btn" @click="goAdd">添加菜品</el-button>
    </div>

    <div class="table-wrap">
      <el-table :data="dishes" v-loading="loading" border stripe>
        <el-table-column label="图片" width="80" class-name="col-image">
          <template #default="{ row }">
            <img v-if="row.image_url" :src="serverUrl + row.image_url" loading="lazy" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
            <span v-else style="color: #62666d;">无图</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="菜品名称" min-width="120" />
        <el-table-column label="分类" width="100" class-name="col-category">
          <template #default="{ row }">{{ row.category?.name }}</template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="80" class-name="col-price">
          <template #default="{ row }">¥{{ row.price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip class-name="col-desc" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="goEdit(row.id)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-pagination
      v-if="total > pageSize"
      class="pagination"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="onPageChange"
    />
  </el-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.search-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 200px;
}

.category-select {
  width: 150px;
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 10px;
  }

  .search-group {
    width: 100%;
  }

  .search-input {
    flex: 1;
    min-width: 0;
  }

  .category-select {
    width: 120px;
  }

  .add-btn {
    width: 100%;
  }

  .col-desc {
    display: none;
  }
}

@media (max-width: 480px) {
  .search-group {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  .search-input {
    width: 100%;
    grid-column: 1;
    grid-row: 1;
  }

  .search-group > .el-button {
    grid-column: 2;
    grid-row: 1;
  }

  .category-select {
    width: 100%;
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .col-category {
    display: none;
  }
}
</style>
