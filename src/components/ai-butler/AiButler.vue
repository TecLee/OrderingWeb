<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AiButlerBubble from './AiButlerBubble.vue'
import AiButlerPanel from './AiButlerPanel.vue'
import { useCartStore } from '../../stores/cart'
import type { ChatMessage } from './types'

// Fallback for browsers without crypto.randomUUID (e.g. older iOS Safari)
function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    )
  }
}

const cartStore = useCartStore()

const isOpen = ref(false)
const isStreaming = ref(false)
const isThinking = ref(false)
const thinkingMessage = ref('')
const messages = ref<ChatMessage[]>([])
const bubblePos = ref({ x: 0, y: 0 })
const menuReady = ref(false)
const menuError = ref(false)
const abortController = ref<AbortController | null>(null)
const systemPrompt = ref('')

const THINKING_MESSAGES = [
  '正在帮您匹配今天的美食...',
  '正在给您寻找旗鼓相当的菜品...',
  '正在给您搭配火辣辣的菜品...',
  '您的菜品正在骑马来的路上...',
  '正在翻箱倒柜找您爱吃的...',
  '正在厨房偷偷尝一口再告诉您...',
  '正在帮您挑最好的那一道菜...',
  '正在琢磨您今天会喜欢什么...',
  '正在为您精挑细选美味中...',
  '正在召唤今日最佳菜品...',
]

function pickRandomThinking(): string {
  const idx = Math.floor(Math.random() * THINKING_MESSAGES.length)
  return THINKING_MESSAGES[idx]
}

// Lazy imports so build doesn't break if API files are missing
let buildSystemPrompt: (() => Promise<string>) | null = null
let streamChat: ((messages: Array<{ role: string; content: string }>, signal: AbortSignal) => AsyncGenerator<{ content: string; done: boolean }>) | null = null

onMounted(async () => {
  try {
    const [promptModule, apiModule] = await Promise.all([
      import('./promptBuilder'),
      import('./butlerApi'),
    ])
    buildSystemPrompt = promptModule.buildSystemPrompt
    streamChat = apiModule.streamChat

    systemPrompt.value = await buildSystemPrompt()
    menuReady.value = true
  } catch {
    menuError.value = true
  }
})

onUnmounted(() => {
  if (abortController.value) {
    abortController.value.abort()
  }
})

function openPanel() {
  isOpen.value = true
  if (messages.value.length === 0) {
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: '你好！我是小厨，你的 AI 管家。想吃什么？我可以帮你推荐今天的菜品哦~',
      timestamp: Date.now(),
    })
  }
}

function closePanel() {
  isOpen.value = false
  if (isStreaming.value && abortController.value) {
    abortController.value.abort()
  }
}

function togglePanel(val: boolean) {
  if (val) {
    openPanel()
  } else {
    closePanel()
  }
}

async function sendMessage(text: string) {
  if (!streamChat || isStreaming.value || isThinking.value) return

  messages.value.push({
    id: generateId(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
  })

  // Create assistant message and push to reactive array
  messages.value.push({
    id: generateId(),
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
  })
  // Get the reactive proxy reference (NOT the raw object)
  const assistantMsg = messages.value[messages.value.length - 1]

  // Show thinking animation while waiting for first response chunk
  isThinking.value = true
  thinkingMessage.value = pickRandomThinking()
  isStreaming.value = true

  const controller = new AbortController()
  abortController.value = controller

  // Typewriter: buffer incoming chunks, release characters one by one
  let fullContent = ''
  let typewriterPos = 0
  let typewriterTimer: ReturnType<typeof setInterval> | null = null

  function startTypewriter() {
    if (typewriterTimer) return
    typewriterTimer = setInterval(() => {
      if (typewriterPos < fullContent.length) {
        typewriterPos++
        assistantMsg.content = fullContent.slice(0, typewriterPos)
      }
    }, 30) // ~33 chars/sec, natural reading speed
  }

  function flushTypewriter() {
    if (typewriterTimer) {
      clearInterval(typewriterTimer)
      typewriterTimer = null
    }
    assistantMsg.content = fullContent
  }

  // Rebuild system prompt with latest cart state every request
  if (buildSystemPrompt) {
    try {
      systemPrompt.value = await buildSystemPrompt()
    } catch { /* keep old prompt */ }
  }

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt.value },
    ]

    const visibleMessages = messages.value.filter(m => m.role !== 'system' && m.id !== assistantMsg.id)
    const trimmed = visibleMessages.slice(-20)
    for (const m of trimmed) {
      apiMessages.push({ role: m.role, content: m.content })
    }

    let firstChunk = true
    for await (const chunk of streamChat(apiMessages, controller.signal)) {
      if (firstChunk) {
        isThinking.value = false
        thinkingMessage.value = ''
        startTypewriter()
        firstChunk = false
      }
      if (chunk.done) break
      fullContent += chunk.content
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      assistantMsg.isError = true
      if (!assistantMsg.content) {
        assistantMsg.content = '抱歉，回复失败，请重试。'
      }
    }
  } finally {
    flushTypewriter()
    isThinking.value = false
    thinkingMessage.value = ''
    isStreaming.value = false
    abortController.value = null
    // Refresh cart (AI may have modified it via tools)
    cartStore.loadCart()
  }
}

function retryLastMessage() {
  if (messages.value.length < 2) return
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg.role === 'assistant' && lastMsg.isError) {
    messages.value.pop()
  }
  const lastUserMsg = [...messages.value].reverse().find(m => m.role === 'user')
  if (lastUserMsg) {
    messages.value.pop()
    sendMessage(lastUserMsg.content)
  }
}

function clearConversation() {
  messages.value = []
  messages.value.push({
    id: generateId(),
    role: 'assistant',
    content: '你好！我是小厨，你的 AI 管家。想吃什么？我可以帮你推荐今天的菜品哦~',
    timestamp: Date.now(),
  })
}
</script>

<template>
  <AiButlerBubble
    :model-value="isOpen"
    :position="bubblePos"
    @update:model-value="togglePanel"
    @update:position="bubblePos = $event"
  />
  <Teleport to="body">
    <AiButlerPanel
      v-if="isOpen"
      :messages="messages"
      :is-streaming="isStreaming"
      :is-thinking="isThinking"
      :thinking-message="thinkingMessage"
      :menu-ready="menuReady"
      :menu-error="menuError"
      @close="closePanel"
      @send="sendMessage"
      @retry="retryLastMessage"
      @clear="clearConversation"
    />
  </Teleport>
</template>
