import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface Channel {
  id: string
  type: string
  name: string
  enabled: boolean
  status: 'online' | 'offline' | 'error'
}

export const useChannelStore = defineStore('channel', () => {
  const channels = ref<Channel[]>([])
  const loading = ref(false)

  async function fetchChannels() {
    loading.value = true
    try {
      const response = await gatewayApi.channels.status()
      if (response.ok && response.result) {
        channels.value = response.result as Channel[]
      } else {
        notify(`获取通道列表失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取通道列表出错: ${e}`, 'error')
    }
    loading.value = false
  }

  async function startChannel(channelId: string) {
    try {
      const response = await gatewayApi.channels.start(channelId)
      if (response.ok) {
        const channel = channels.value.find((c) => c.id === channelId)
        if (channel) {
          channel.enabled = true
          channel.status = 'online'
        }
        notify('通道已启动', 'success')
      } else {
        notify(`启动通道失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`启动通道出错: ${e}`, 'error')
    }
  }

  async function stopChannel(channelId: string) {
    try {
      const response = await gatewayApi.channels.stop(channelId)
      if (response.ok) {
        const channel = channels.value.find((c) => c.id === channelId)
        if (channel) {
          channel.enabled = false
          channel.status = 'offline'
        }
        notify('通道已停止', 'info')
      } else {
        notify(`停止通道失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`停止通道出错: ${e}`, 'error')
    }
  }

  return {
    channels,
    loading,
    fetchChannels,
    startChannel,
    stopChannel,
  }
})
