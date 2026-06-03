<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useCartStore } from '../../stores/cart'
import AiButler from '../../components/ai-butler/AiButler.vue'
import PwaPrompt from '../../components/common/PwaPrompt.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const showMePopup = ref(false)
const isMobile = ref(window.innerWidth < 768)
const tabIndex = ref(0)

function checkWidth() {
  isMobile.value = window.innerWidth < 768
}

function syncTabIndex(path: string) {
  if (path.includes('/cart')) tabIndex.value = 1
  else if (path.includes('/orders')) tabIndex.value = 2
  else tabIndex.value = 0
}

watch(() => route.path, syncTabIndex, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', checkWidth)
  cartStore.loadCart()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkWidth)
})

function goTab(tab: typeof tabs[0]) {
  if (tab.action === 'me') {
    showMePopup.value = true
    return
  }
  router.push(tab.path)
}

function handleLogout() {
  userStore.clearAuth()
  router.push('/login')
}

const tabs = [
  { path: '/user/menu', icon: 'M3 12h18M3 6h18M3 18h18', label: '菜单' },
  { path: '/user/cart', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0', label: '购物车' },
  { path: '/user/orders', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 15h6', label: '订单' },
  { path: '', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', label: '我的', action: 'me' },
]
</script>

<template>
  <div class="user-layout">
    <!-- Desktop top nav -->
    <header v-if="!isMobile" class="user-header">
      <div class="nav-brand">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#5e6ad2" stroke-width="1.5" stroke-linecap="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <path d="M6 1v3" /><path d="M10 1v3" /><path d="M14 1v3" />
        </svg>
        <span>家庭私厨</span>
      </div>
      <nav class="nav-links">
        <router-link to="/user/menu" class="nav-link" active-class="active">菜单</router-link>
        <router-link to="/user/cart" class="nav-link" active-class="active">
          购物车
          <span v-if="cartStore.totalCount > 0" class="nav-badge">{{ cartStore.totalCount }}</span>
        </router-link>
        <router-link to="/user/orders" class="nav-link" active-class="active">我的订单</router-link>
      </nav>
      <div class="nav-user">
        <span class="user-name">{{ userStore.user?.nickname || userStore.user?.phone || '用户' }}</span>
        <el-button text size="small" @click="handleLogout" style="color: #8a8f98;">退出</el-button>
      </div>
    </header>

    <!-- Main content area -->
    <main :class="['user-main', { 'has-bottom-tabs': isMobile }]">
      <router-view />
    </main>

    <AiButler />
    <PwaPrompt />

    <!-- Mobile bottom tab bar -->
    <nav v-if="isMobile" class="bottom-tabs">
      <div
        v-for="(tab, i) in tabs"
        :key="tab.label"
        class="tab"
        :class="{ active: tab.action !== 'me' && tabIndex === i }"
        @click="goTab(tab)"
      >
        <div class="tab-icon-wrap">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" :stroke="(tab.action !== 'me' && tabIndex === i) ? '#5e6ad2' : '#62666d'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path :d="tab.icon" />
          </svg>
          <span v-if="tab.label === '购物车' && cartStore.totalCount > 0" class="tab-badge">{{ cartStore.totalCount }}</span>
        </div>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </nav>

    <!-- "我的" popup -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showMePopup" class="me-overlay" @click="showMePopup = false">
          <div class="me-sheet" @click.stop>
            <div class="me-sheet-title">{{ userStore.user?.nickname || userStore.user?.phone || '用户' }}</div>
            <button class="me-sheet-btn" @click="showMePopup = false; handleLogout()">退出登录</button>
            <button class="me-sheet-cancel" @click="showMePopup = false">取消</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.user-layout {
  min-height: 100vh;
  background: #010102;
  display: flex;
  flex-direction: column;
}

/* Desktop header */
.user-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: #0d0e10;
  border-bottom: 1px solid #1e2026;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f7f8f8;
  font-size: 18px;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  color: #8a8f98;
  text-decoration: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.15s;
  position: relative;
}

.nav-link:hover {
  color: #f7f8f8;
  background: #1a1b1e;
}

.nav-link.active {
  color: #5e6ad2;
  background: rgba(94, 106, 210, 0.1);
}

.nav-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #e5484d;
  color: #fff;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  color: #8a8f98;
  font-size: 14px;
}

/* Main content */
.user-main {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 16px;
}

.user-main.has-bottom-tabs {
  padding-bottom: 72px;
}

/* Mobile bottom tabs */
.bottom-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #0d0e10;
  border-top: 1px solid #1e2026;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 4px 16px;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.tab.active .tab-label {
  color: #5e6ad2;
}

.tab-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  background: #e5484d;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.tab-label {
  font-size: 11px;
  color: #62666d;
}

/* "我的" action sheet */
.me-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.me-sheet {
  width: 100%;
  max-width: 480px;
  background: #0f1011;
  border-radius: 16px 16px 0 0;
  padding: 24px 16px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0));
}

.me-sheet-title {
  text-align: center;
  color: #f7f8f8;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.me-sheet-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 10px;
  background: rgba(229, 72, 77, 0.1);
  color: #e5484d;
  font-size: 15px;
  cursor: pointer;
  margin-bottom: 10px;
}

.me-sheet-btn:active {
  background: rgba(229, 72, 77, 0.2);
}

.me-sheet-cancel {
  width: 100%;
  height: 48px;
  border: 1px solid #23252a;
  border-radius: 10px;
  background: #1a1b1e;
  color: #8a8f98;
  font-size: 15px;
  cursor: pointer;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
