<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { mockLogin } from '../../api/user-auth'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({ phone: '', code: '' })
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!form.value.phone.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!form.value.code.trim()) {
    ElMessage.warning('请输入验证码')
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await mockLogin(form.value.phone, form.value.code)
    userStore.setAuth(res.data.token, res.data.user)
    router.push('/user/menu')
  } catch {
    errorMsg.value = '登录失败，请检查手机号或验证码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#5e6ad2" stroke-width="1.5" stroke-linecap="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <path d="M6 1v3" /><path d="M10 1v3" /><path d="M14 1v3" />
        </svg>
        <h1>家庭私厨</h1>
        <p>扫码点餐，轻松下单</p>
      </div>

      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon class="error-alert" />

      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.phone" placeholder="请输入手机号" size="large" maxlength="11" />
        </el-form-item>
        <el-form-item>
          <div class="code-row">
            <el-input v-model="form.code" placeholder="验证码" size="large" maxlength="6" />
            <span class="code-hint">默认 1234</span>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" class="login-btn" @click="handleLogin">
            登录 / 注册
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #010102;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 12px;
  padding: 40px 28px;
}

.brand {
  text-align: center;
  margin-bottom: 32px;
}

.brand h1 {
  color: #f7f8f8;
  font-size: 24px;
  margin: 12px 0 4px;
  font-weight: 600;
}

.brand p {
  color: #8a8f98;
  font-size: 14px;
}

.error-alert {
  margin-bottom: 16px;
}

.code-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.code-hint {
  color: #62666d;
  font-size: 12px;
  white-space: nowrap;
}

.login-btn {
  width: 100%;
}

@media (max-width: 480px) {
  .login-card {
    padding: 32px 20px;
  }
}
</style>
