import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface Agent {
  id: string
  name: string
  description?: string
  model?: string
  systemPrompt?: string
  createdAt: number
  updatedAt?: number
}

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<Agent[]>([])
  const currentAgent = ref<Agent | null>(null)
  const loading = ref(false)

  // 获取所有 Agent
  async function fetchAgents() {
    loading.value = true
    try {
      const response = await gatewayApi.agents.list()
      if (response.ok && response.result) {
        agents.value = response.result as Agent[]
      } else {
        notify(`获取智能体列表失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取智能体列表出错: ${e}`, 'error')
    }
    loading.value = false
  }

  // 创建 Agent
  async function createAgent(config: Omit<Agent, 'id' | 'createdAt'>) {
    try {
      const response = await gatewayApi.agents.create(config)
      if (response.ok && response.result) {
        const newAgent = response.result as Agent
        agents.value.push(newAgent)
        notify('智能体创建成功', 'success')
        return newAgent
      }
      notify(`创建智能体失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`创建智能体出错: ${e}`, 'error')
    }
    return null
  }

  // 更新 Agent
  async function updateAgent(agentId: string, config: Partial<Agent>) {
    try {
      const response = await gatewayApi.agents.update(agentId, config)
      if (response.ok) {
        const index = agents.value.findIndex((a) => a.id === agentId)
        if (index !== -1) {
          agents.value[index] = { ...agents.value[index], ...config }
        }
        notify('智能体更新成功', 'success')
        return true
      }
      notify(`更新智能体失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`更新智能体出错: ${e}`, 'error')
    }
    return false
  }

  // 删除 Agent
  async function deleteAgent(agentId: string) {
    try {
      const response = await gatewayApi.agents.delete(agentId)
      if (response.ok) {
        agents.value = agents.value.filter((a) => a.id !== agentId)
        if (currentAgent.value?.id === agentId) {
          currentAgent.value = null
        }
        notify('智能体已删除', 'info')
        return true
      }
      notify(`删除智能体失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`删除智能体出错: ${e}`, 'error')
    }
    return false
  }

  // 选择 Agent
  function selectAgent(agent: Agent) {
    currentAgent.value = agent
  }

  return {
    agents,
    currentAgent,
    loading,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    selectAgent,
  }
})
