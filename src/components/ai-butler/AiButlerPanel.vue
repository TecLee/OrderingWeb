<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { ChatMessage } from './types'

const props = defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
  isThinking: boolean
  thinkingMessage: string
  menuReady: boolean
  menuError: boolean
}>()

const emit = defineEmits<{
  close: []
  send: [text: string]
  retry: []
  clear: []
}>()

const inputText = ref('')
const messageList = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isMobile = ref(window.innerWidth < 768)
const isAtBottom = ref(true)

function updateSize() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  window.addEventListener('resize', updateSize)
  document.addEventListener('keydown', handleGlobalKeydown)
  scrollToBottom()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
  document.removeEventListener('keydown', handleGlobalKeydown)
})

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

watch(() => props.messages.length, () => {
  nextTick(scrollToBottom)
})

// Watch for streaming content changes to auto-scroll
watch(
  () => {
    const msgs = props.messages
    if (msgs.length === 0) return ''
    return msgs[msgs.length - 1].content
  },
  () => {
    if (isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  },
)

function onMessageListScroll() {
  if (!messageList.value) return
  const el = messageList.value
  isAtBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 60
}

function scrollToBottom() {
  if (!messageList.value) return
  messageList.value.scrollTop = messageList.value.scrollHeight
}

function autoResize() {
  if (!textareaRef.value) return
  const el = textareaRef.value
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text || props.isStreaming) return
  emit('send', text.slice(0, 2000))
  inputText.value = ''
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function renderMessage(msg: ChatMessage): string {
  if (msg.role === 'user') {
    return escapeHtml(msg.content)
  }
  if (msg.role === 'assistant' && msg.content) {
    // During streaming, show plain text to avoid broken markdown rendering
    const isLastStreaming = props.isStreaming && msg === props.messages[props.messages.length - 1]
    if (isLastStreaming) {
      return escapeHtml(msg.content)
    }
    const raw = marked.parse(msg.content, { breaks: true }) as string
    return DOMPurify.sanitize(raw)
  }
  return ''
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const panelClass = computed(() => ({
  'butler-panel': true,
  'is-mobile': isMobile.value,
}))
</script>

<template>
  <div :class="panelClass">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-info">
        <div class="header-avatar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#5e6ad2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        </div>
        <div>
          <div class="header-title">小厨</div>
          <div class="header-subtitle">AI 管家</div>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="messages.length > 1" class="header-btn" title="清空对话" @click="emit('clear')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
        <button class="header-btn" title="关闭" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messageList" class="message-list" @scroll="onMessageListScroll">
      <!-- Menu error state -->
      <div v-if="menuError" class="error-banner">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>菜单加载失败，AI 管家暂时无法使用</span>
      </div>

      <!-- Messages -->
      <template v-for="msg in messages" :key="msg.id">
        <div :class="['message', msg.role]">
          <div class="message-text" v-html="renderMessage(msg)" />
          <div v-if="msg.role === 'assistant' && isStreaming && msg === messages[messages.length - 1] && msg.content" class="streaming-cursor"></div>
          <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          <div v-if="msg.isError" class="retry-btn" @click="emit('retry')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            重试
          </div>
        </div>
      </template>

      <!-- Thinking indicator -->
      <div v-if="isThinking" class="message assistant thinking-msg">
        <div class="message-text thinking-bubble">
          <span class="thinking-dots">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </span>
          <span class="thinking-label">{{ thinkingMessage }}</span>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="input-area">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="input-field"
        :disabled="isStreaming || isThinking || (!menuReady && !menuError)"
        :placeholder="menuError ? 'AI 服务不可用' : (isThinking || isStreaming) ? '小厨正在思考...' : '输入消息...'"
        maxlength="500"
        rows="1"
        @input="autoResize"
        @keydown="handleKeydown"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || isStreaming"
        @click="handleSend"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.butler-panel {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #0d0e10;
  border: 1px solid #1e2026;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  /* Desktop: dialog mode */
  right: 24px;
  bottom: 100px;
  width: 420px;
  height: 600px;
  border-radius: 12px;
}

/* Mobile: fullscreen */
.butler-panel.is-mobile {
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
  border: none;
  right: auto;
  bottom: auto;
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #1e2026;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(94, 106, 210, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title {
  color: #f7f8f8;
  font-size: 15px;
  font-weight: 600;
}

.header-subtitle {
  color: #62666d;
  font-size: 11px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8a8f98;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.header-btn:hover {
  background: #1a1b1e;
  color: #f7f8f8;
}

/* Message list */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-width: thin;
  scrollbar-color: #2b2d30 transparent;
}

.message-list::-webkit-scrollbar {
  width: 4px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: #2b2d30;
  border-radius: 2px;
}

/* Error banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(229, 72, 77, 0.1);
  border: 1px solid rgba(229, 72, 77, 0.2);
  border-radius: 8px;
  color: #e5484d;
  font-size: 13px;
}

/* Messages */
.message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  animation: msg-in 0.25s ease-out;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-text {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message.user .message-text {
  background: #5e6ad2;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-text {
  background: #1a1b1e;
  color: #d0d6e0;
  border-bottom-left-radius: 4px;
}

/* Markdown content styles */
.message.assistant .message-text :deep(p) {
  margin: 0 0 8px 0;
}

.message.assistant .message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message.assistant .message-text :deep(strong) {
  color: #f7f8f8;
  font-weight: 600;
}

.message.assistant .message-text :deep(em) {
  color: #d0d6e0;
}

.message.assistant .message-text :deep(code) {
  background: #252629;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #e5484d;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.message.assistant .message-text :deep(ul),
.message.assistant .message-text :deep(ol) {
  padding-left: 18px;
  margin: 4px 0;
}

.message.assistant .message-text :deep(li) {
  margin-bottom: 2px;
}

.message.assistant .message-text :deep(blockquote) {
  border-left: 2px solid #5e6ad2;
  padding-left: 12px;
  margin: 8px 0;
  color: #8a8f98;
}

.message-time {
  font-size: 11px;
  color: #62666d;
  margin-top: 4px;
  padding: 0 4px;
}

.message.user .message-time {
  text-align: right;
}

/* Streaming cursor as inline element after content */
.message.assistant .streaming-cursor {
  display: inline;
}

.message.assistant .streaming-cursor::after {
  content: '|';
  animation: blink 0.8s infinite;
  color: #5e6ad2;
  font-weight: 600;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Retry button */
.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 4px 10px;
  border: 1px solid #3a3d42;
  border-radius: 6px;
  background: transparent;
  color: #e5484d;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  align-self: flex-start;
}

.retry-btn:hover {
  background: rgba(229, 72, 77, 0.1);
  border-color: #e5484d;
}

/* Input area */
.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #1e2026;
  flex-shrink: 0;
}

.input-field {
  flex: 1;
  resize: none;
  border: 1px solid #1e2026;
  border-radius: 8px;
  background: #1a1b1e;
  color: #f7f8f8;
  font-size: 14px;
  font-family: inherit;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.15s;
  max-height: 120px;
}

.input-field:focus {
  border-color: #5e6ad2;
}

.input-field::placeholder {
  color: #62666d;
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #5e6ad2;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.send-btn:hover:not(:disabled) {
  background: #6b75e0;
}

.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

/* Thinking indicator */
.thinking-msg {
  animation: msg-in 0.25s ease-out;
}

.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thinking-dots {
  display: flex;
  gap: 3px;
  align-items: center;
}

.thinking-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5e6ad2;
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.thinking-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.thinking-label {
  color: #8a8f98;
  font-size: 13px;
}

/* Streaming cursor as inline element after content */
.message.assistant .streaming-cursor {
  display: inline;
}

.message.assistant .streaming-cursor::after {
  content: '|';
  animation: blink 0.8s infinite;
  color: #5e6ad2;
  font-weight: 600;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile adjustments */
.is-mobile .message-list {
  padding: 16px 12px;
}

.is-mobile .input-area {
  padding: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
}
</style>
