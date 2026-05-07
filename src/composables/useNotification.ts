import { ref } from 'vue'

export interface Notification {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

// 模块级响应式状态，可在组件和非组件环境（如 store）中共用
const notifications = ref<Notification[]>([])
let nextId = 0

/**
 * 全局发送通知（可在 store 等非组件环境中使用）
 */
export function notify(message: string, type: Notification['type'] = 'error') {
  const id = nextId++
  notifications.value.push({ id, message, type })
  // 4 秒后自动移除
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }, 4000)
}

/**
 * 在组件中使用通知列表（响应式）
 */
export function useNotification() {
  function dismiss(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    notifications,
    dismiss,
  }
}
