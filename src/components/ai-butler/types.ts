export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isError?: boolean
}

export interface StreamChunk {
  content: string
  done: boolean
}
