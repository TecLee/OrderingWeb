import request from './index'
import type { ApiResponse, Order, PaginatedData, OrderStats } from '../types'

export function getOrders(params: {
  status?: string
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedData<Order>>> {
  return request.get('/orders', { params })
}

export function getOrderDetail(id: number): Promise<ApiResponse<Order>> {
  return request.get(`/orders/${id}`)
}

export function updateOrderStatus(id: number, status: string): Promise<ApiResponse<Order>> {
  return request.put(`/orders/${id}/status`, { status })
}

export function getStats(): Promise<ApiResponse<OrderStats>> {
  return request.get('/stats')
}
