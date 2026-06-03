import { ref } from 'vue'

/**
 * Returns a debounced version of the callback.
 * The callback is only called after `delay` ms of inactivity.
 * The returned ref `pending` is true while waiting.
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const pending = ref(false)

  function debounced(...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    pending.value = true
    timer = setTimeout(() => {
      pending.value = false
      fn(...args)
    }, delay)
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      pending.value = false
    }
  }

  return { debounced, pending, cancel }
}

/**
 * Returns a throttled version of the callback.
 * The callback runs immediately, then ignores calls for `delay` ms.
 * The returned ref `locked` is true while throttled.
 */
export function useThrottle<T extends (...args: any[]) => Promise<any> | any>(
  fn: T,
  delay: number = 800,
) {
  const locked = ref(false)

  async function throttled(...args: Parameters<T>): Promise<ReturnType<T> | undefined> {
    if (locked.value) return
    locked.value = true
    try {
      return await fn(...args)
    } finally {
      setTimeout(() => {
        locked.value = false
      }, delay)
    }
  }

  return { throttled, locked }
}
