<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/auth'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ username: 'admin', password: 'admin123' })
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await login(form.value.username, form.value.password)
    authStore.setAuth(res.data.token, res.data.user)
    router.push('/')
  } catch {
    errorMsg.value = '用户名或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5e6ad2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <h2>点菜管理系统</h2>
      <p class="login-sub">登录以管理菜品数据</p>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item v-if="errorMsg">
          <el-alert :title="errorMsg" type="error" show-icon :closable="false" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%;"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #010102;
  padding: 16px;
}

.login-card {
  width: 400px;
  max-width: 100%;
  padding: 40px;
  background: #0f1011;
  border: 1px solid #23252a;
  border-radius: 12px;
}

.login-brand {
  text-align: center;
  margin-bottom: 16px;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 4px;
  color: #f7f8f8;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.4px;
}

.login-sub {
  text-align: center;
  color: #8a8f98;
  font-size: 14px;
  margin-bottom: 32px;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
  }

  .login-card h2 {
    font-size: 20px;
  }

  .login-sub {
    font-size: 13px;
    margin-bottom: 24px;
  }
}
</style>
