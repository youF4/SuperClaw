import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface Provider {
  id: string
  name: string
  type: string
  configured: boolean
  models: string[]
}

export const useProviderStore = defineStore('provider', () => {
  const providers = ref<Provider[]>([])
  const loading = ref(false)

  async function fetchProviders() {
    loading.value = true
    try {
      const response = await gatewayApi.models.list()
      if (response.ok && response.result) {
        // 从模型列表提取 provider 信息
        const modelList = response.result as Array<{ provider: string; id: string }>
        const providerMap = new Map<string, Provider>()
        
        modelList.forEach(model => {
          if (!providerMap.has(model.provider)) {
            providerMap.set(model.provider, {
              id: model.provider,
              name: getProviderName(model.provider),
              type: model.provider,
              configured: false,
              models: [],
            })
          }
          providerMap.get(model.provider)!.models.push(model.id)
        })
        
        providers.value = Array.from(providerMap.values())
      } else {
        notify(`获取模型列表失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取模型列表出错: ${e}`, 'error')
    }
    loading.value = false
  }

  async function checkAuthStatus() {
    try {
      const response = await gatewayApi.models.authStatus()
      if (response.ok && response.result) {
        const status = response.result as Record<string, boolean>
        providers.value.forEach(p => {
          p.configured = status[p.id] || false
        })
      } else {
        notify(`获取认证状态失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取认证状态出错: ${e}`, 'error')
    }
  }

  return {
    providers,
    loading,
    fetchProviders,
    checkAuthStatus,
  }
})

function getProviderName(id: string): string {
  const names: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google AI',
    moonshot: 'Moonshot (Kimi)',
    deepseek: 'DeepSeek',
    zhipu: '智谱 AI',
    alibaba: '阿里云通义',
    baidu: '百度文心',
    minimax: 'MiniMax',
  }
  return names[id] || id
}
