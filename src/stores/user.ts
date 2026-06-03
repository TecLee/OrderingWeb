import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MiniAppUser } from '../types'

export const useUserStore = defineStore('user', () => {
  const user = ref<MiniAppUser | null>(null)
  const token = ref(localStorage.getItem('user_token') || '')

  function setAuth(t: string, u: MiniAppUser) {
    token.value = t
    user.value = u
    localStorage.setItem('user_token', t)
    localStorage.setItem('user_info', JSON.stringify(u))
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem('user_token')
    localStorage.removeItem('user_info')
  }

  // Restore user from localStorage
  const saved = localStorage.getItem('user_info')
  if (saved) {
    try { user.value = JSON.parse(saved) } catch { /* ignore */ }
  }

  return { user, token, setAuth, clearAuth }
})
