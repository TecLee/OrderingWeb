import miniappRequest from './miniapp'
import type { ApiResponse } from '../types'

export function getCart(): Promise<ApiResponse<{ items: any[]; total_count: number }>> {
  return miniappRequest.get('/cart')
}

export function addToCart(dishId: number, quantity: number = 1): Promise<ApiResponse<any>> {
  return miniappRequest.post('/cart', { dish_id: dishId, quantity })
}

export function updateCartItem(itemId: number, quantity: number): Promise<ApiResponse<any>> {
  return miniappRequest.put(`/cart/${itemId}`, { quantity })
}

export function removeCartItem(itemId: number): Promise<ApiResponse<null>> {
  return miniappRequest.delete(`/cart/${itemId}`)
}
