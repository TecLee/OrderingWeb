import { getUserCategories, getUserDishes } from '../../api/user-dishes'
import { getCart } from '../../api/user-cart'

export async function buildSystemPrompt(): Promise<string> {
  let menuText = '暂无菜品信息'
  let cartText = '购物车为空'

  try {
    const [catRes, dishRes] = await Promise.all([
      getUserCategories(),
      getUserDishes({ page_size: 50 }),
    ])

    const categories = catRes.data || []
    const dishes = dishRes.data?.items || []

    if (dishes.length > 0) {
      const catMap = new Map<number, string>()
      for (const c of categories) {
        catMap.set(c.id, c.name)
      }

      const grouped = new Map<string, typeof dishes>()
      for (const d of dishes) {
        const catName = d.category_id ? catMap.get(d.category_id) || '其他' : '其他'
        if (!grouped.has(catName)) grouped.set(catName, [])
        grouped.get(catName)!.push(d)
      }

      const lines: string[] = []
      for (const [catName, items] of grouped) {
        lines.push(`\n【${catName}】`)
        for (const d of items) {
          const desc = d.description ? ` - ${d.description}` : ''
          lines.push(`  ${d.name}（¥${d.price.toFixed(0)}）${desc}`)
        }
      }
      menuText = lines.join('\n')
    }
  } catch {
    menuText = '菜单加载失败'
  }

  // Get current cart state
  try {
    const cartRes = await getCart()
    const items = cartRes.data?.items || []
    if (items.length > 0) {
      const lines = items.map((item: any) =>
        `  ${item.dish.name} x${item.quantity} = ¥${(item.dish.price * item.quantity).toFixed(0)}`
      )
      const total = items.reduce((sum: number, item: any) => sum + item.dish.price * item.quantity, 0)
      lines.push(`  总计: ¥${total.toFixed(0)}`)
      cartText = lines.join('\n')
    }
  } catch {
    cartText = '购物车加载失败'
  }

  return `你是"家庭私厨"餐厅的 AI 管家，名叫小厨。

## ⚠️ 最重要的规则
你有工具可以真实操作购物车和下单。当用户要加菜/删菜/改数量/备注/下单时，**必须调用工具，不能只说不做**。
- 如果只说话不调工具，购物车不会有任何变化！
- 用户说"加一份红烧肉" → 调 add_to_cart
- 用户说"下单吧"或"就这些" → 调 place_order
- **绝对禁止**在没调工具时说"已添加"、"已下单"

## 禁止事项
- **禁止**在回复里提到任何工具名（add_to_cart、place_order等）
- **禁止**说"让我调用XX工具"、"正在使用XX功能"
- **禁止**描述你的内部操作过程
- 用户不需要知道你用了什么工具，只需要看到结果

## 你的性格
- 热情、友好，像餐厅管家
- 回复简洁自然，每次 200 字以内
- 用口语化中文，不要用 markdown

## 今日菜单
${menuText}

## 当前购物车
${cartText}

## 下单规则（重要）
- 用户明确说"下单"/"就这些"/"结账"/"帮我下单"→ **立即调 place_order**，不要再确认
- 用户说"加XX然后下单" → 先加菜，再下单，一气呵成
- 用户说"推荐" → 推荐菜品，等用户选了再加购物车
- 菜名不确定时先 search_dishes 确认`
}
