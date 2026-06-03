export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface Category {
  id: number
  name: string
}

export interface Dish {
  id: number
  name: string
  description: string
  price: number
  image_url: string
  category_id: number
  category: Category | null
  created_by: number | null
}

export interface AdminUser {
  id: number
  username: string
  display_name: string
  role: string
}

export interface MiniAppUser {
  id: number
  phone: string
  nickname: string
  avatar_url: string
  role: string
  permissions: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'completed' | 'cancelled'

export interface OrderItem {
  id: number
  dish_id: number
  dish_name: string
  quantity: number
  unit_price: number
  note: string
}

export interface Order {
  id: number
  user_id: number
  status: OrderStatus
  total_amount: number
  note: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderStats {
  today_orders: number
  pending_orders: number
  completed_orders: number
  cancelled_orders: number
  cooking_orders: number
  hourly_distribution: { hour: number; count: number }[]
  top_dishes: { dish_name: string; total_quantity: number }[]
  status_breakdown: Record<string, number>
  total_dishes: number
  total_categories: number
  total_users: number
}

export interface CartItemLocal {
  id: number
  user_id: number
  dish_id: number
  quantity: number
  dish: Dish | null
  note: string
}
