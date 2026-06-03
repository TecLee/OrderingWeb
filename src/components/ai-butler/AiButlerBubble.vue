<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:position': [pos: { x: number; y: number }]
}>()

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const posStart = ref({ x: 0, y: 0 })
const hasMoved = ref(false)

const isMobile = ref(window.innerWidth < 768)

function updateSize() {
  isMobile.value = window.innerWidth < 768
  clampPosition()
}

function clampPosition() {
  const size = 52
  const maxX = window.innerWidth - size
  const maxY = window.innerHeight - size
  const pos = { ...props.position }
  pos.x = Math.max(0, Math.min(pos.x, maxX))
  pos.y = Math.max(0, Math.min(pos.y, maxY))
  if (pos.x !== props.position.x || pos.y !== props.position.y) {
    emit('update:position', pos)
  }
}

onMounted(() => {
  window.addEventListener('resize', updateSize)
  // Set initial default position if not set
  if (props.position.x === 0 && props.position.y === 0) {
    const defaultBottom = isMobile.value ? 80 : 24
    emit('update:position', {
      x: window.innerWidth - 52 - (isMobile.value ? 16 : 24),
      y: window.innerHeight - 52 - defaultBottom,
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
})

function onDragStart(e: MouseEvent | TouchEvent) {
  if (e instanceof MouseEvent && e.button !== 0) return
  e.preventDefault()

  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY

  isDragging.value = true
  hasMoved.value = false
  dragStart.value = { x: clientX, y: clientY }
  posStart.value = { ...props.position }

  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  window.addEventListener('touchmove', onDragMove, { passive: false })
  window.addEventListener('touchend', onDragEnd)
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  e.preventDefault()

  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY

  const dx = clientX - dragStart.value.x
  const dy = clientY - dragStart.value.y

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    hasMoved.value = true
  }

  const newX = posStart.value.x + dx
  const newY = posStart.value.y + dy

  emit('update:position', { x: newX, y: newY })
}

function onDragEnd() {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('touchmove', onDragMove)
  window.removeEventListener('touchend', onDragEnd)

  if (!isDragging.value) return
  isDragging.value = false
  clampPosition()

  // If didn't move much, treat as click
  if (!hasMoved.value) {
    emit('update:modelValue', !props.modelValue)
  }
}

const bubbleStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}))
</script>

<template>
  <div
    class="butler-bubble"
    :class="{ open: modelValue }"
    :style="bubbleStyle"
    @mousedown="onDragStart"
    @touchstart="onDragStart"
  >
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8" />
      <path d="M8 13h6" />
    </svg>
  </div>
</template>

<style scoped>
.butler-bubble {
  position: fixed;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #5e6ad2;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 9998;
  box-shadow: 0 4px 16px rgba(94, 106, 210, 0.35);
  transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
  animation: butler-pulse 3s ease-in-out infinite;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.butler-bubble:hover {
  background: #6b75e0;
  box-shadow: 0 6px 20px rgba(94, 106, 210, 0.5);
}

.butler-bubble:active {
  cursor: grabbing;
}

.butler-bubble.open {
  animation: none;
  background: #4b54b8;
}

@keyframes butler-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
</style>
