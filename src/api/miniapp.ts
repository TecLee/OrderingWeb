import axios from 'axios'
import { ElMessage } from 'element-plus'

const miniappRequest = axios.create({
  baseURL: import.meta.env.VITE_MINIPP_API_BASE,
  timeout: 15000,
})

miniappRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

miniappRequest.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body.code !== 0) {
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message))
    }
    return body
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_info')
      window.location.href = '/login'
    } else {
      ElMessage.error(error.response?.data?.detail || error.message || '网络错误')
    }
    return Promise.reject(error)
  },
)

export default miniappRequest
