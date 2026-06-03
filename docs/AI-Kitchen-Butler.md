# AI 厨房管家 — 架构详解

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 (Browser)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Bubble   │  │  Panel   │  │ AiButler │  │promptBuilder│  │
│  │ 浮动气泡  │  │ 聊天面板  │  │  编排器   │  │ 系统提示词  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │             │               │         │
│       └──────────────┴──────┬──────┘               │         │
│                             │                      │         │
│                      butlerApi.ts                  │         │
│                      (SSE 流式客户端)               │         │
│                             │                      │         │
└─────────────────────────────┼──────────────────────┘         │
                              │  POST /api/v1/miniapp/ai/chat  │
                              ▼                                │
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (HTTPS 反向代理)                     │
│               proxy_buffering off（SSE 逐块转发）             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                FastAPI 后端 (Uvicorn)                        │
│                                                             │
│  routers/miniapp_ai.py                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           _handle_tool_calls()                       │    │
│  │                                                     │    │
│  │  ① 检测用户意图 (关键词匹配)                          │    │
│  │  ② 调用 DeepSeek API (带 tools 定义)                 │    │
│  │  ③ AI 返回 tool_calls? ──Yes──▶ 执行工具 (操作DB)    │    │
│  │       │                        └── 结果回传 AI ──┐   │    │
│  │       │No                                        │   │    │
│  │  ④ 最终文本 → 流式返回 (SSE)             ◀────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  TOOLS (7个函数):                                           │
│  ┌──────────────┬──────────────────────────────┐            │
│  │ search_dishes │ 模糊搜索菜品                  │            │
│  │ get_cart      │ 查看购物车                    │            │
│  │ add_to_cart   │ 加菜到购物车                  │            │
│  │ update_cart_item │ 修改数量                  │            │
│  │ remove_from_cart │ 删除菜品                  │            │
│  │ set_order_note   │ 添加备注                  │            │
│  │ place_order      │ 确认下单                  │            │
│  └──────────────┴──────────────────────────────┘            │
│                                                             │
│               │                     ▲                       │
│               ▼                     │                       │
│  ┌─────────────────────────────────────┐                    │
│  │         SQLite 数据库                │                    │
│  │  users | dishes | cart_items | orders│                   │
│  └─────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │   DeepSeek API (云端)      │
              │   model: deepseek-chat    │
              │   Function Calling 模式   │
              └───────────────────────────┘
```

---

## 二、核心原理：Function Calling（工具调用）

### 2.1 为什么需要 Function Calling？

普通 AI 只能"说话"，不能"做事"。用户说"加一份红烧肉"，普通 AI 会回答"好的已添加"，但实际上购物车根本没变——这叫**幻觉 (Hallucination)**。

Function Calling 让 AI 真正动手操作数据库：

```
用户: "加一份红烧肉"
       │
       ▼
AI 决定: 调用 add_to_cart("红烧肉", 1)
       │
       ▼
后端执行: INSERT INTO cart_items (user_id, dish_id, quantity) VALUES (1, 5, 1)
       │
       ▼
返回结果: "已将红烧肉 x1 加入购物车"
       │
       ▼
AI 回答用户: "好的，红烧肉已加入购物车，还需其他吗？"
```

### 2.2 DeepSeek Function Calling 流程

```python
# 发给 DeepSeek 的请求包含 tools 定义
{
  "model": "deepseek-chat",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "add_to_cart",
        "description": "把菜品加入购物车",
        "parameters": {
          "dish_name": {"type": "string"},
          "quantity": {"type": "integer"}
        }
      }
    },
    # ... 共 7 个工具
  ],
  "tool_choice": "auto"  # AI 自己决定是否调工具
}
```

**AI 返回两种情况：**

- **需要执行操作** → `finish_reason: "tool_calls"`，包含函数名和参数
- **纯文本回复** → `finish_reason: "stop"`，直接流式输出给用户

### 2.3 工具调用循环（最多 5 轮）

```
第 1 轮: 发消息 + tools → AI 返回 tool_calls: add_to_cart("红烧肉", 1)
         执行 add_to_cart → 结果: "Added 红烧肉 x1 to cart"
                             │
第 2 轮: 将工具结果追加到消息历史 → AI 返回 tool_calls: add_to_cart("米饭", 1)
         执行 add_to_cart → 结果: "Added 米饭 x1 to cart"
                             │
第 3 轮: AI 判断任务完成 → finish_reason: "stop"
         文本: "好的，已加红烧肉和米饭，还需什么吗？"
                             │
         → 通过 SSE 流式输出给前端
```

### 2.4 强制工具调用机制

为了防止 AI "只说不做"（幻觉），加入了关键词检测：

```python
action_keywords = ["加", "来一份", "下单", "点菜", ...]
needs_action = any(kw in last_user_msg for kw in action_keywords)

# 用户消息包含动作关键词 → 第一轮强制 tool_choice="required"
tc = "required" if (needs_action and round_num == 0) else "auto"
```

`tool_choice: "required"` 强制 DeepSeek **必须**调用至少一个工具，不能只输出文字。

---

## 三、如何限定只回答菜品相关问题

### 3.1 第一道防线：System Prompt（系统提示词）

```markdown
你是"家庭私厨"餐厅的 AI 管家，名叫小厨。

## 严格规则
- 只讨论与菜单、点餐、餐厅相关的话题
- 不要编造菜单上没有的菜品
- 不要提供烹饪方法或菜谱
- 如果被问到无关话题，礼貌引导回点餐主题

## 今日菜单
【热菜】
  红烧肉（¥38）
  清炒时蔬（¥18）
...

## 当前购物车
红烧肉 x1 = ¥38
总计: ¥38
```

### 3.2 第二道防线：工具限制

AI 只有 7 个工具可用——全部围绕菜品、购物车、订单。它没有"搜索网页""讲笑话""写代码"等通用工具，物理上无法处理无关话题。

### 3.3 第三道防线：数据库约束

工具执行时查询的是真实数据库：
- `search_dishes` 只查 `dishes` 表，分词匹配
- `add_to_cart` 先验证菜名是否存在，不存在就返回"未找到"
- `place_order` 购物车为空时拒绝下单

### 3.4 衍生问题的处理策略

| 用户问题 | AI 处理方式 | 实际调用 |
|----------|------------|---------|
| "红烧肉是什么肉？" | 从数据库 `description` 字段获取描述 | search_dishes("红烧肉") |
| "有没有不辣的菜？" | 搜索描述中不含"辣"的菜 | search_dishes 模糊匹配 |
| "给我推荐两个人的搭配" | 分析菜单，推荐荤素搭配 | get_cart + search_dishes |
| "上次点的那个菜还有吗？" | 无法查历史（功能未开放），引导看菜单 | 文本引导 |
| "你们的地址在哪？" | 不在菜单范围内，礼貌引导 | 无工具调用 |
| "帮我写一首诗" | 拒绝，引导回点餐 | 无工具调用 |

---

## 四、完整交互流程

```
用户点击气泡 → 打开聊天面板
     │
     ▼
onMounted → 懒加载 promptBuilder + butlerApi
     │       └→ buildSystemPrompt() 获取菜单 + 购物车
     │
     ▼
用户输入 "来一份红烧肉" → 点发送
     │
     ├→ 前端 AiButler.vue::sendMessage()
     │     ├→ 重新拉取最新购物车状态 (buildSystemPrompt)
     │     ├→ 显示"思考中"动画
     │     ├→ 构建 apiMessages = [system prompt, ...对话历史]
     │     └→ 调用 butlerApi.streamChat(apiMessages)
     │            │
     │            ▼
     ├→ POST /api/v1/miniapp/ai/chat  (SSE 流式)
     │     │
     │     ▼
     ├→ 后端 _handle_tool_calls()
     │     │
     │     ├→ 检测关键词 "来一份" → needs_action=True
     │     ├→ 第1轮: tool_choice="required" → DeepSeek 返回 add_to_cart("红烧肉", 1)
     │     │         执行 → INSERT INTO cart_items → 返回 "Added 红烧肉 x1"
     │     ├→ 第2轮: DeepSeek 判断完成 → finish_reason="stop"
     │     │         文本: "好嘞，红烧肉（¥38）已加入购物车！"
     │     └→ SSE 流式返回: data: {"choices":[{"delta":{"content":"好"}}]}
     │                       data: {"choices":[{"delta":{"content":"嘞"}}]}
     │                       data: {"choices":[{"delta":{"content":"，"}}]}
     │                       ...
     │
     ▼
前端 butlerApi.ts 解析 SSE
     │  每遇到 \n\n 分隔符 → 解析一个 SSE 事件
     │  一次只 yield 一个事件 (确保逐字渲染)
     │
     ▼
前端 AiButler.vue 打字机效果
     │  fullContent 累积完整文本
     │  setInterval 每 30ms 从 fullContent 取一个字显示
     │  首块到达 → 关闭"思考中" → 开启打字机
     │
     ▼
finally → flushTypewriter() → 显示完整文本
     │    → cartStore.loadCart() → 刷新购物车 UI
     │
     ▼
用户看到: "好嘞，红烧肉（¥38）已加入购物车！"
购物车徽标: 1 件
```

---

## 五、技术细节

### 5.1 SSE 流式传输

```python
# 后端: StreamingResponse 逐字节转发
async def stream_final():
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", DEEPSEEK_URL, json={...}) as response:
            async for chunk in response.aiter_bytes():
                yield chunk  # ← 每个字节立即发出

return StreamingResponse(
    stream_final(),
    media_type="text/event-stream",
    headers={"X-Accel-Buffering": "no"}  # 禁止 Nginx 缓冲
)
```

```typescript
// 前端: ReadableStream 逐块读取
const reader = response.body.getReader()
while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // 每次只处理一个完整的 SSE 事件 → yield
    const idx = buffer.indexOf('\n\n')
    if (idx !== -1) {
        const event = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        yield parseSSEEvent(event)
        continue  // ← 让出控制权给 Vue 渲染
    }
}
```

### 5.2 打字机效果

```typescript
let fullContent = ''        // 完整 AI 回复
let typewriterPos = 0       // 已显示到第几个字

// setInterval 每 30ms 释放一个字
typewriterTimer = setInterval(() => {
    if (typewriterPos < fullContent.length) {
        typewriterPos++
        assistantMsg.content = fullContent.slice(0, typewriterPos)
    }
}, 30)

// fullContent 随 streamChat 持续增长 → 打字机追赶显示
```

### 5.3 防抖节流

```typescript
// 加购物车: 节流 800ms，同菜品重复点击被拦截
const addingDishes = reactive<Set<number>>(new Set())
async function handleAddToCart(dish: Dish) {
    if (addingDishes.has(dish.id)) return
    addingDishes.add(dish.id)
    try { await cartStore.addToCart(dish.id, 1) }
    finally { setTimeout(() => addingDishes.delete(dish.id), 800) }
}
```

### 5.4 AI 上下文管理

每次发消息前重新构建 system prompt：

```typescript
// promptBuilder.ts — 每次请求都调用
export async function buildSystemPrompt(): Promise<string> {
    const [catRes, dishRes] = await Promise.all([
        getUserCategories(),
        getUserDishes({ page_size: 50 }),
    ])
    const cartRes = await getCart()
    // 拼接: 角色设定 + 今日菜单 + 当前购物车 + 工具说明 + 规则
    return `你是...\n## 今日菜单\n${menuText}\n## 当前购物车\n${cartText}...`
}
```

对话历史保留最近 20 条消息，防止 token 溢出。

---

## 六、关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| AI 模型 | DeepSeek Chat | 中文能力强、便宜、支持 Function Calling |
| 通信方式 | SSE (Server-Sent Events) | 单向流式推送，比 WebSocket 简单 |
| API Key 位置 | 服务器端 `.env` | 不暴露给浏览器 |
| 工具调用 | 后端执行 + 数据库操作 | 安全、可靠、可审计 |
| 流式渲染 | 前端 SSE 解析 + 逐字释放 | 自然聊天体验 |
| 购物车同步 | 每次发消息前重新拉取 | 避免过期数据导致幻觉 |
| 防抖 | 前端锁机制 (Set<id>) | 防止重复请求，简单有效 |
| Nginx 配置 | proxy_buffering off (AI 路由) | SSE 需要逐块转发 |
| HTTPS | Let's Encrypt 免费证书 | 生产环境必备 + PWA 要求 |
| 路由守卫 | localStorage token 检查 | 区分顾客/厨师/管理员 |

---

## 七、文件索引

```
前端:
  src/components/ai-butler/
    ├── AiButler.vue          # 编排器: 发送消息、类型机、状态管理
    ├── AiButlerBubble.vue    # 浮动气泡按钮 (可拖拽)
    ├── AiButlerPanel.vue     # 聊天面板 UI (消息列表、输入框)
    ├── butlerApi.ts          # SSE 流式客户端 (Fetch + ReadableStream)
    ├── promptBuilder.ts      # 系统提示词构建 (菜单+购物车+规则)
    └── types.ts              # ChatMessage / StreamChunk 类型

  src/composables/
    └── useDebounce.ts        # 防抖/节流 composable

  src/stores/
    ├── cart.ts               # 购物车 Pinia store
    └── auth.ts               # 认证 Pinia store

  src/router/
    └── index.ts              # 路由守卫 (顾客/厨师/管理员分流)

后端:
  routers/
    ├── miniapp_ai.py         # AI 对话 + Function Calling 核心
    ├── miniapp_cart.py       # 购物车 CRUD
    └── miniapp_orders.py     # 下单 + WebSocket 广播

  utils/
    ├── ws_manager.py         # WebSocket 管理器 (厨房看板推送)
    └── init_db.py            # 数据库初始化 + 种子数据

  config.py                   # 配置 (DEEPSEEK_API_KEY 等)

服务器:
  /etc/nginx/
    ├── nginx.conf            # 安全头 + 限流
    └── conf.d/ordering.conf   # 域名配置 + HTTPS + WebSocket
```

---
