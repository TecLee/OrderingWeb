<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import PwaPrompt from '../../components/common/PwaPrompt.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)

function toggleMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMenu() {
  mobileMenuOpen.value = false
}

function handleLogout() {
  closeMenu()
  authStore.clearAuth()
  router.push('/login')
}

// Close drawer on route change
watch(() => route.path, closeMenu)
</script>

<template>
  <el-container class="app-root">
    <!-- Mobile backdrop -->
    <div v-if="mobileMenuOpen" class="mobile-backdrop" @click="closeMenu" />

    <!-- Sidebar -->
    <el-aside :class="['app-sidebar', mobileMenuOpen && 'app-sidebar--open']" width="220px">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e6ad2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>点菜管理</span>
      </div>
      <el-menu
        :default-active="route.path"
        background-color="#010102"
        text-color="#8a8f98"
        active-text-color="#5e6ad2"
        router
        @select="closeMenu"
      >
        <el-menu-item index="/dashboard">
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/dishes">
          <span>菜品管理</span>
        </el-menu-item>
        <el-menu-item index="/categories">
          <span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/profile">
          <span>个人中心</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="header-start">
          <button class="hamburger" @click="toggleMenu">
            <span />
            <span />
            <span />
          </button>
          <svg class="header-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e6ad2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span class="header-title">点菜管理</span>
        </div>
        <div class="header-end">
          <span class="header-user">{{ authStore.user?.display_name || '管理员' }}</span>
          <el-button text @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
  <PwaPrompt />
</template>

<style scoped>
.app-root {
  height: 100%;
  position: relative;
}

/* ---- Sidebar ---- */
.app-sidebar {
  background: #010102;
  border-right: 1px solid #23252a;
  overflow-y: auto;
  transition: transform 0.25s ease;
  z-index: 1000;
}

.logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  color: #f7f8f8;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
  border-bottom: 1px solid #23252a;
}

/* ---- Header ---- */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  background: #010102;
  border-bottom: 1px solid #23252a;
  padding: 0 16px;
  gap: 12px;
}

.header-start {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-end {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-title {
  color: #f7f8f8;
  font-size: 15px;
  font-weight: 600;
  display: none;
}

.header-user {
  color: #d0d6e0;
  font-size: 13px;
  margin-right: 8px;
}

/* ---- Hamburger ---- */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.hamburger span {
  display: block;
  width: 20px;
  height: 2px;
  background: #d0d6e0;
  border-radius: 1px;
  transition: all 0.2s ease;
}

.header-logo {
  display: none;
  flex-shrink: 0;
}

/* ---- Main ---- */
.app-main {
  background: #010102;
  min-height: 0;
  padding: 24px;
}

/* ---- Mobile backdrop ---- */
.mobile-backdrop {
  display: none;
}

/* ============================================================
   Tablet & Phone — sidebar becomes drawer
   ============================================================ */
@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    z-index: 1001;
  }

  .app-sidebar--open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
  }

  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  .hamburger {
    display: flex;
  }

  .header-logo {
    display: block;
  }

  .header-title {
    display: inline;
  }

  .app-main {
    padding: 16px 12px;
  }

  .header-user {
    font-size: 12px;
    margin-right: 4px;
  }
}

@media (max-width: 480px) {
  .app-main {
    padding: 12px 8px;
  }

  .app-header {
    padding: 0 12px;
  }
}
</style>
