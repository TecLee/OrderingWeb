import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminUser } from '../types'
import { getMe } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const token = ref(localStorage.getItem('admin_token') || '')

  function setAuth(t: string, u: AdminUser) {
    token.value = t
    user.value = u
    localStorage.setItem('admin_token', t)
    localStorage.setItem('admin_user', JSON.stringify(u))
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const res = await getMe()
      user.value = res.data
    } catch {
      clearAuth()
    }
  }

  // Restore user from localStorage
  const saved = localStorage.getItem('admin_user')
  if (saved) {
    try { user.value = JSON.parse(saved) } catch { /* ignore */ }
  }

  return { user, token, setAuth, clearAuth, fetchUser }
})
