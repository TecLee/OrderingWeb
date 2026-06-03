<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../../api/index'

const router = useRouter()
const form = ref({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!form.value.username.trim() || !form.value.password.trim()) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await request.post('/auth/login', form.value)
    const { token, user } = res.data
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))

    // Chef or admin both go to kitchen
    router.push('/kitchen')
  } catch {
    errorMsg.value = '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="chef-login-page">
    <div class="chef-login-card">
      <div class="brand">
        <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
        <h1>厨房看板</h1>
        <p>家庭私厨 · 厨师登录</p>
      </div>

      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon class="error-alert" />

      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="厨师账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" class="login-btn" @click="handleLogin">
            进入厨房看板
          </el-button>
        </el-form-item>
      </el-form>

      <div class="hint">默认厨师账号：chef / chef123</div>
    </div>
  </div>
</template>

<style scoped>
.chef-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #010102;
  padding: 20px;
}

.chef-login-card {
  width: 100%;
  max-width: 380px;
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 12px;
  padding: 48px 32px;
}

.brand {
  text-align: center;
  margin-bottom: 32px;
}

.brand h1 {
  color: #f7f8f8;
  font-size: 24px;
  margin: 16px 0 4px;
  font-weight: 600;
}

.brand p {
  color: #8a8f98;
  font-size: 14px;
}

.error-alert {
  margin-bottom: 16px;
}

.login-btn {
  width: 100%;
}

.hint {
  text-align: center;
  color: #3a3d42;
  font-size: 12px;
  margin-top: 16px;
}

@media (max-width: 480px) {
  .chef-login-card {
    padding: 32px 20px;
  }
}
</style>
