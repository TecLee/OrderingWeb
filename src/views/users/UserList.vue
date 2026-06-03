<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUsers, updateUser } from '../../api/users'
import type { MiniAppUser } from '../../types'

const users = ref<MiniAppUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)

const form = reactive({
  id: 0,
  phone: '',
  nickname: '',
  role: 'user',
  permissions: ['dish:query'],
})

const roleOptions = [
  { label: '普通用户', value: 'user' },
  { label: '厨师', value: 'chef' },
  { label: '管理员', value: 'admin' },
]

const permOptions = [
  { label: '查询菜品', value: 'dish:query' },
  { label: '新增菜品', value: 'dish:add' },
  { label: '编辑菜品', value: 'dish:edit' },
  { label: '删除菜品', value: 'dish:delete' },
]

onMounted(() => loadUsers())

async function loadUsers() {
  loading.value = true
  try {
    const res = await getUsers({ page: page.value, page_size: pageSize.value })
    users.value = res.data.items
    total.value = res.data.total
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

function permissionsLabel(p: string) {
  const map: Record<string, string> = {
    'dish:query': '查询',
    'dish:add': '新增',
    'dish:edit': '编辑',
    'dish:delete': '删除',
  }
  if (!p) return '无'
  return p.split(',').map(v => map[v.trim()] || v.trim()).join('、')
}

function onPageChange(p: number) {
  page.value = p
  loadUsers()
}

function openEditDialog(user: MiniAppUser) {
  form.id = user.id
  form.phone = user.phone
  form.nickname = user.nickname
  form.role = user.role
  form.permissions = user.permissions ? user.permissions.split(',').map(s => s.trim()) : []
  dialogVisible.value = true
}

async function handleSave() {
  saving.value = true
  try {
    await updateUser(form.id, {
      role: form.role,
      permissions: form.permissions.join(','),
    })
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadUsers()
  } catch { /* ignore */ }
  finally { saving.value = false }
}
</script>

<template>
  <el-card v-loading="loading">
    <h3 class="page-title">小程序用户列表</h3>
    <div class="table-wrap">
      <el-table :data="users" border stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="手机号" width="150" class-name="col-phone">
          <template #default="{ row }">{{ maskPhone(row.phone) }}</template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" class-name="col-nickname" />
        <el-table-column label="角色" width="90" class-name="col-role">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'admin' ? 'danger' : row.role === 'chef' ? 'warning' : ''">
              {{ row.role === 'admin' ? '管理员' : row.role === 'chef' ? '厨师' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" min-width="160" class-name="col-perms">
          <template #default="{ row }">{{ permissionsLabel(row.permissions) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
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

  <el-dialog v-model="dialogVisible" title="编辑用户" width="480px" class="user-dialog" destroy-on-close>
    <el-form label-width="72px" label-position="left">
      <el-form-item label="手机号">
        <el-input :model-value="maskPhone(form.phone)" disabled />
      </el-form-item>
      <el-form-item label="昵称">
        <el-input v-model="form.nickname" disabled />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="form.role" style="width: 100%">
          <el-option
            v-for="r in roleOptions"
            :key="r.value"
            :label="r.label"
            :value="r.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="菜品权限">
        <el-checkbox-group v-model="form.permissions" class="perm-group">
          <el-checkbox
            v-for="p in permOptions"
            :key="p.value"
            :label="p.value"
            :value="p.value"
          >
            {{ p.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.page-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.perm-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
}

@media (max-width: 768px) {
  .col-perms {
    display: none;
  }
}

@media (max-width: 480px) {
  .col-nickname {
    display: none;
  }
}
</style>
