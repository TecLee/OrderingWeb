<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <el-card>
    <h3 style="margin-bottom: 16px; font-size: 15px; font-weight: 600;">个人信息</h3>
    <el-descriptions :column="1" border>
      <el-descriptions-item label="用户名">{{ authStore.user?.username }}</el-descriptions-item>
      <el-descriptions-item label="显示名">{{ authStore.user?.display_name }}</el-descriptions-item>
      <el-descriptions-item label="角色">
        <el-tag v-if="authStore.user?.role === 'super_admin'" type="danger">超级管理员</el-tag>
        <el-tag v-else>管理员</el-tag>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<style scoped>
h3 {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 480px) {
  h3 {
    font-size: 14px;
    margin-bottom: 12px;
  }
}
</style>
