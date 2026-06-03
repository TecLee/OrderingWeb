<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories'
import type { Category } from '../../types'

const categories = ref<Category[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const form = ref({ name: '' })

onMounted(() => loadCategories())

async function loadCategories() {
  loading.value = true
  try {
    const res = await getCategories()
    categories.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openAdd() {
  isEdit.value = false
  editId.value = null
  form.value = { name: '' }
  dialogVisible.value = true
}

function openEdit(cat: Category) {
  isEdit.value = true
  editId.value = cat.id
  form.value = { name: cat.name }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    if (isEdit.value && editId.value) {
      await updateCategory(editId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await createCategory(form.value)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadCategories()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除该分类吗？', '提示', { type: 'warning' })
    await deleteCategory(id)
    ElMessage.success('删除成功')
    loadCategories()
  } catch { /* cancelled */ }
}
</script>

<template>
  <el-card v-loading="loading">
    <div class="toolbar">
      <span></span>
      <el-button type="primary" @click="openAdd">添加分类</el-button>
    </div>
    <div class="table-wrap">
      <el-table :data="categories" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '添加分类'" width="400px" class="cat-dialog">
      <el-form>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
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
  -webkit-overflow-scrolling: touch;
}
</style>
