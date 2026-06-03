import miniappRequest from './miniapp'
import type { ApiResponse } from '../types'

export function mockLogin(phone: string, code: string): Promise<ApiResponse<{ token: string; user: any }>> {
  return miniappRequest.post('/auth/mock-login', { phone, code })
}
