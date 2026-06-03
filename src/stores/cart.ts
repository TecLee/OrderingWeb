import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItemLocal } from '../types'
import { getCart, addToCart as apiAdd, updateCartItem as apiUpdate, removeCartItem as apiRemove } from '../api/user-cart'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItemLocal[]>([])
  const loading = ref(false)

  const totalCount = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const totalPrice = computed(() => items.value.reduce((sum, i) => sum + (i.dish?.price || 0) * i.quantity, 0))

  async function loadCart() {
    loading.value = true
    try {
      const res = await getCart()
      items.value = res.data.items
    } catch { /* ignore */ }
    finally { loading.value = false }
  }

  async function addToCart(dishId: number, quantity: number = 1) {
    await apiAdd(dishId, quantity)
    await loadCart()
  }

  async function updateQuantity(itemId: number, quantity: number) {
    await apiUpdate(itemId, quantity)
    await loadCart()
  }

  async function removeItem(itemId: number) {
    await apiRemove(itemId)
    await loadCart()
  }

  async function clearCart() {
    for (const item of items.value) {
      await apiRemove(item.id)
    }
    items.value = []
  }

  return { items, loading, totalCount, totalPrice, loadCart, addToCart, updateQuantity, removeItem, clearCart }
})
