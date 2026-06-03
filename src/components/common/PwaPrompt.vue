<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const showBanner = ref(false)
const deferredPrompt = ref<any>(null)

// Platform detection
const platform = computed(() => {
  if (typeof window === 'undefined') return 'other'
  const ua = navigator.userAgent

  // iOS: iPhone + iPod + iPad (iPadOS 13+ pretends to be Mac but has touch)
  if (/iPhone|iPod|iPad/.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios'

  // HarmonyOS stock browser — no PWA support at all
  if (/HarmonyOS|OpenHarmony/.test(ua)) return 'harmony'

  return 'android' // all other browsers: Chrome, Edge, Samsung, MIUI, etc.
})

function canShow(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return false

  const dismissed = localStorage.getItem('pwa-banner-dismissed')
  if (dismissed) {
    const ts = parseInt(dismissed)
    if (Date.now() - ts < 24 * 60 * 60 * 1000) return false // 24h cooldown
  }
  return true
}

onMounted(() => {
  // Listen for Chrome install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    if (canShow()) showBanner.value = true
  })

  // Show after delay if beforeinstallprompt never fires
  setTimeout(() => {
    if (!showBanner.value && canShow()) {
      showBanner.value = true
    }
  }, 5000)
})

function handleInstall() {
  if (deferredPrompt.value && platform.value === 'android') {
    deferredPrompt.value.prompt()
    deferredPrompt.value.userChoice.then(() => {
      deferredPrompt.value = null
      dismiss()
    })
  } else {
    dismiss()
  }
}

function dismiss() {
  showBanner.value = false
  localStorage.setItem('pwa-banner-dismissed', String(Date.now()))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="showBanner" class="install-banner">
        <img src="/logo192.png" class="banner-icon" width="40" height="40" alt="logo" />

        <div class="banner-body">
          <div class="banner-title">家庭私厨</div>
          <div class="banner-hint">
            <template v-if="platform === 'ios'">
              点击 <strong>分享</strong> → <strong>添加到主屏幕</strong>
            </template>
            <template v-else-if="platform === 'harmony'">
              此浏览器不支持 PWA，请用 <strong>Chrome 浏览器</strong> 打开
            </template>
            <template v-else>
              <template v-if="deferredPrompt">点击安装，像 App 一样使用</template>
              <template v-else>右上角 <strong>⋮</strong> → <strong>安装应用</strong></template>
            </template>
          </div>
        </div>

        <button v-if="platform !== 'harmony'" class="banner-btn" @click="handleInstall">
          {{ platform === 'ios' ? '知道了' : deferredPrompt ? '安装' : '知道了' }}
        </button>

        <button class="banner-close" @click="dismiss" title="稍后提醒">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.install-banner {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1b1e;
  border: 1px solid #2b2d30;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  max-width: 480px;
  margin: 0 auto;
}

.banner-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.banner-body {
  flex: 1;
  min-width: 0;
}

.banner-title {
  color: #f7f8f8;
  font-size: 14px;
  font-weight: 600;
}

.banner-hint {
  color: #8a8f98;
  font-size: 12px;
  margin-top: 1px;
  line-height: 1.4;
}

.banner-hint strong {
  color: #5e6ad2;
}

.banner-btn {
  background: #5e6ad2;
  color: #fff;
  border: none;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.banner-btn:active {
  background: #4b54b8;
}

.banner-close {
  background: none;
  border: none;
  color: #62666d;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.slide-up-enter-active { transition: transform 0.3s ease-out, opacity 0.3s; }
.slide-up-leave-active { transition: transform 0.2s ease-in, opacity 0.2s; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
