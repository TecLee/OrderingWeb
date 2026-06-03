<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/auth'
import { mockLogin } from '../api/user-auth'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/user'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const phoneFormRef = ref<FormInstance>()
const adminFormRef = ref<FormInstance>()

// --- Phone login state ---
const mode = ref<'phone' | 'password'>('phone')
const phoneForm = reactive({ phone: '', code: '' })
const codeSending = ref(false)
const codeCountdown = ref(0)
const phoneLoading = ref(false)

const phoneRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 6, message: '验证码为4-6位数字', trigger: 'blur' },
  ],
}

// --- Admin login state ---
const adminForm = reactive({ username: '', password: '' })
const adminError = ref('')
const pwdLoading = ref(false)

const adminRules: FormRules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { max: 32, message: '账号不超过32位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { max: 32, message: '密码不超过32位', trigger: 'blur' },
  ],
}

// --- Send code ---
function sendCode() {
  phoneFormRef.value?.validateField('phone', (valid) => {
    if (!valid) return
    codeSending.value = true
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) {
        clearInterval(timer)
        codeSending.value = false
      }
    }, 1000)
  })
}

// --- Phone login ---
async function handlePhoneLogin() {
  const valid = await phoneFormRef.value?.validate().catch(() => false)
  if (!valid) return
  phoneLoading.value = true
  try {
    const res = await mockLogin(phoneForm.phone.trim(), phoneForm.code)
    userStore.setAuth(res.data.token, res.data.user)
    router.push('/user/menu')
  } catch {
    // error handled by interceptor
  } finally {
    phoneLoading.value = false
  }
}

// --- Admin login ---
async function handlePasswordLogin() {
  const valid = await adminFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  adminError.value = ''
  try {
    const res = await login(adminForm.username, adminForm.password)
    authStore.setAuth(res.data.token, res.data.user)
    const role = res.data.user?.role || ''
    router.push(role === 'chef' ? '/kitchen' : '/')
  } catch {
    adminError.value = '账号或密码错误'
  } finally {
    pwdLoading.value = false
  }
}

function switchToPassword() { mode.value = 'password'; adminError.value = '' }
function switchToPhone() { mode.value = 'phone' }
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5e6ad2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <h2>家庭私厨</h2>
      <p class="login-sub">{{ mode === 'phone' ? '手机号登录' : '账号密码登录' }}</p>

      <!-- Phone mode -->
      <template v-if="mode === 'phone'">
        <el-form ref="phoneFormRef" :model="phoneForm" :rules="phoneRules" @submit.prevent="handlePhoneLogin">
          <el-form-item prop="phone">
            <el-input
              v-model="phoneForm.phone"
              placeholder="请输入手机号"
              size="large"
              maxlength="11"
              :formatter="(v: string) => v.replace(/\D/g, '')"
            />
          </el-form-item>
          <el-form-item prop="code">
            <div class="code-row">
              <el-input
                v-model="phoneForm.code"
                placeholder="验证码"
                size="large"
                maxlength="6"
                :formatter="(v: string) => v.replace(/\D/g, '')"
                @keyup.enter="handlePhoneLogin"
              />
              <el-button
                class="code-btn"
                size="large"
                :disabled="codeCountdown > 0"
                @click="sendCode"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="phoneLoading"
              style="width: 100%"
              @click="handlePhoneLogin"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>
        <p class="switch-mode">
          已有后台账号？<span class="link" @click="switchToPassword">账号密码登录</span>
        </p>
      </template>

      <!-- Password mode -->
      <template v-else>
        <el-form ref="adminFormRef" :model="adminForm" :rules="adminRules" @submit.prevent="handlePasswordLogin">
          <el-form-item prop="username">
            <el-input
              v-model="adminForm.username"
              placeholder="请输入账号"
              size="large"
              maxlength="32"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="adminForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              maxlength="32"
              show-password
              @keyup.enter="handlePasswordLogin"
            />
          </el-form-item>
          <el-form-item v-if="adminError">
            <el-alert :title="adminError" type="error" show-icon :closable="false" />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="pwdLoading"
              style="width: 100%"
              @click="handlePasswordLogin"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>
        <p class="switch-mode">
          <span class="link" @click="switchToPhone">← 返回手机号登录</span>
        </p>
      </template>
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
  margin-bottom: 12px;
}

.login-card h2 {
  text-align: center;
  margin: 0 0 4px;
  color: #f7f8f8;
  font-size: 22px;
  font-weight: 600;
}

.login-sub {
  text-align: center;
  color: #8a8f98;
  font-size: 14px;
  margin-bottom: 28px;
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row .el-input {
  flex: 1;
}

.code-row .code-btn {
  flex-shrink: 0;
}

.switch-mode {
  text-align: center;
  color: #62666d;
  font-size: 13px;
  margin-top: 16px;
}

.link {
  color: #8a8f98;
  cursor: pointer;
  transition: color 0.15s;
}

.link:hover {
  color: #5e6ad2;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
  }
  .login-card h2 {
    font-size: 20px;
  }
}
</style>
