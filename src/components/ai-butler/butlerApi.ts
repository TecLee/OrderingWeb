import type { StreamChunk } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1/admin'

export async function* streamChat(
  messages: Array<{ role: string; content: string }>,
  signal: AbortSignal,
): AsyncGenerator<StreamChunk> {
  // Use user_token first (matches the cart/order APIs), fallback to admin_token
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token') || ''
  const url = API_BASE.replace(/\/admin$/, '/miniapp') + '/ai/chat'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('登录已过期，请重新登录')
    }
    if (response.status === 429) {
      throw new Error('AI 服务繁忙，请稍后再试')
    }
    throw new Error(`AI 服务错误 (${response.status})`)
  }

  if (!response.body) {
    throw new Error('浏览器不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      // Process ONE SSE event at a time so the event loop can flush between yields
      const idx = buffer.indexOf('\n\n')
      if (idx !== -1) {
        const event = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const chunk = parseSSEEvent(event)
        if (chunk) yield chunk
        continue  // yield control, then check for more events
      }

      // Need more data from the stream
      const { done, value } = await reader.read()

      if (done) {
        // Flush remaining buffer
        buffer += decoder.decode()
        for (const chunk of parseSSEBuffer(buffer)) {
          yield chunk
        }
        yield { content: '', done: true }
        break
      }

      buffer += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

function parseSSEEvent(event: string): StreamChunk | null {
  const trimmed = event.trim()
  if (!trimmed || trimmed === 'data: [DONE]') return null

  if (trimmed.startsWith('data: ')) {
    try {
      const json = JSON.parse(trimmed.slice(6))
      const delta = json.choices?.[0]?.delta
      if (delta?.content) {
        return { content: delta.content, done: false }
      }
    } catch {
      // Skip unparseable lines
    }
  }
  return null
}

function parseSSEBuffer(buffer: string): StreamChunk[] {
  const chunks: StreamChunk[] = []
  const events = buffer.split('\n\n')
  for (const event of events) {
    const chunk = parseSSEEvent(event)
    if (chunk) chunks.push(chunk)
  }
  return chunks
}
