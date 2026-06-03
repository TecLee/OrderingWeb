<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCartStore } from '../../stores/cart'
import { placeOrder } from '../../api/user-orders'

const router = useRouter()
const cartStore = useCartStore()
const submitting = ref(false)
const dialogVisible = ref(false)
const orderNote = ref('')
const serverUrl = import.meta.env.VITE_SERVER_URL
const lockedItems = reactive<Set<number>>(new Set())

onMounted(() => cartStore.loadCart())

function getImageUrl(url: string) {
  if (!url) return ''
  return url.startsWith('http') ? url : serverUrl + url
}

async function handleCheckout() {
  submitting.value = true
  try {
    const items = cartStore.items.map(i => ({
      dish_id: i.dish_id,
      quantity: i.quantity,
      note: i.note || '',
    }))
    await placeOrder({ note: orderNote.value, items })
    ElMessage.success('下单成功')
    dialogVisible.value = false
    orderNote.value = ''
    await cartStore.loadCart()
  } catch { /* ignore */ }
  finally { submitting.value = false }
}

// Throttled quantity change (prevents rapid +/- clicks)
async function handleQuantityChange(itemId: number, newQty: number) {
  if (lockedItems.has(itemId)) return
  lockedItems.add(itemId)
  try {
    await cartStore.updateQuantity(itemId, newQty)
  } catch { /* ignore */ }
  finally {
    setTimeout(() => lockedItems.delete(itemId), 500)
  }
}

// Throttled remove (prevents rapid delete clicks)
async function handleRemoveItem(itemId: number) {
  if (lockedItems.has(itemId)) return
  lockedItems.add(itemId)
  try {
    await cartStore.removeItem(itemId)
  } catch { /* ignore */ }
  finally {
    setTimeout(() => lockedItems.delete(itemId), 500)
  }
}

function goMenu() {
  router.push('/user/menu')
}
</script>

<template>
  <div class="cart-page">
    <h2 class="page-title">购物车</h2>

    <div v-if="cartStore.items.length === 0" class="empty-cart">
      <el-empty description="购物车是空的">
        <el-button type="primary" @click="goMenu">去点菜</el-button>
      </el-empty>
    </div>

    <template v-else>
      <!-- Cart items -->
      <div class="cart-list">
        <div v-for="item in cartStore.items" :key="item.id" class="cart-item">
          <div
            class="cart-item-img"
            :style="item.dish?.image_url ? { backgroundImage: `url(${getImageUrl(item.dish.image_url)})` } : {}"
          />
          <div class="cart-item-body">
            <div class="cart-item-name">{{ item.dish?.name || '未知菜品' }}</div>
            <div class="cart-item-price">&yen;{{ item.dish?.price?.toFixed(2) || '0.00' }}</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" @click="handleQuantityChange(item.id, item.quantity - 1)" :disabled="item.quantity <= 1">−</button>
            <span class="qty-val">{{ item.quantity }}</span>
            <button class="qty-btn" @click="handleQuantityChange(item.id, item.quantity + 1)">+</button>
          </div>
          <button class="cart-item-del" @click="handleRemoveItem(item.id)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Summary bar -->
      <div class="cart-summary">
        <div class="summary-left">
          <span class="summary-total">合计 <strong>&yen;{{ cartStore.totalPrice.toFixed(2) }}</strong></span>
          <span class="summary-count">共 {{ cartStore.totalCount }} 件</span>
        </div>
        <el-button type="primary" size="large" @click="dialogVisible = true">去结算</el-button>
      </div>
    </template>

    <!-- Checkout dialog -->
    <el-dialog v-model="dialogVisible" title="确认下单" width="400px" class="checkout-dialog">
      <div class="checkout-body">
        <p>共 <strong>{{ cartStore.totalCount }}</strong> 件商品，合计 <strong>&yen;{{ cartStore.totalPrice.toFixed(2) }}</strong></p>
        <el-input v-model="orderNote" type="textarea" :rows="2" placeholder="备注（可选）：如少盐、不加葱等" />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCheckout">确认下单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-title {
  color: #f7f8f8;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 80px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #0d0e10;
  border: 1px solid #1e2026;
  border-radius: 10px;
  padding: 12px;
}

.cart-item-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background: #1a1b1e center / cover no-repeat;
  flex-shrink: 0;
}

.cart-item-body {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  color: #f7f8f8;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item-price {
  color: #e5484d;
  font-size: 14px;
  font-weight: 500;
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #3a3d42;
  border-radius: 50%;
  background: #1a1b1e;
  color: #8a8f98;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.qty-btn:hover:not(:disabled) {
  border-color: #5e6ad2;
  color: #5e6ad2;
}

.qty-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.qty-val {
  color: #f7f8f8;
  font-size: 15px;
  min-width: 20px;
  text-align: center;
}

.cart-item-del {
  border: none;
  background: none;
  color: #62666d;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.cart-item-del:hover {
  color: #e5484d;
}

.cart-summary {
  position: fixed;
  bottom: 56px;
  left: 0;
  right: 0;
  background: #0d0e10;
  border-top: 1px solid #1e2026;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 50;
}

.summary-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-total {
  color: #f7f8f8;
  font-size: 15px;
}

.summary-total strong {
  color: #e5484d;
  font-size: 18px;
}

.summary-count {
  color: #62666d;
  font-size: 12px;
}

.checkout-body {
  color: #f7f8f8;
}

.checkout-body p {
  margin-bottom: 12px;
}

@media (min-width: 768px) {
  .cart-summary {
    position: sticky;
    bottom: auto;
    border-radius: 10px;
    margin-top: 16px;
  }
}
</style>
