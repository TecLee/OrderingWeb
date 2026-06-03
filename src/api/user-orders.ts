import miniappRequest from './miniapp'
import type { ApiResponse, Order, PaginatedData } from '../types'

export function placeOrder(data: {
  note?: string
  items: { dish_id: number; quantity: number; note?: string }[]
}): Promise<ApiResponse<Order>> {
  return miniappRequest.post('/orders', data)
}

export function getMyOrders(params: {
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedData<Order>>> {
  return miniappRequest.get('/orders', { params })
}

export function getOrderDetail(id: number): Promise<ApiResponse<Order>> {
  return miniappRequest.get(`/orders/${id}`)
}
