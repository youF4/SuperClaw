import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface UsageStats {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: number
  byModel: Record<string, { tokens: number; cost: number }>
  byDay: Array<{ date: string; tokens: number; cost: number }>
}

export const useUsageStore = defineStore('usage', () => {
  const stats = ref<UsageStats | null>(null)
  const loading = ref(false)

  async function fetchStats() {
    loading.value = true
    
    try {
      const statusRes = await gatewayApi.usage.status()
      if (statusRes.ok && statusRes.result) {
        stats.value = statusRes.result as UsageStats
      } else {
        notify(`获取用量统计失败: ${statusRes.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取用量统计出错: ${e}`, 'error')
    }
    
    loading.value = false
  }

  return {
    stats,
    loading,
    fetchStats,
  }
})