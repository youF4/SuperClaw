import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { notify } from '@/composables/useNotification'

export const useGatewayStore = defineStore('gateway', () => {
  const running = ref(false)
  const pid = ref<number | null>(null)
  const loading = ref(false)

  async function start() {
    loading.value = true
    try {
      const result = await invoke<string>('start_gateway')
      // 解析 result 中的 PID，格式: "Gateway started with PID: 1234"
      const pidMatch = result.match(/PID:?\s*(\d+)/)
      if (pidMatch) {
        pid.value = parseInt(pidMatch[1], 10)
      }
      running.value = true
      notify('Gateway 已启动', 'success')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      notify(`Gateway 启动失败: ${msg}`, 'error')
    }
    loading.value = false
  }

  async function stop() {
    loading.value = true
    try {
      await invoke('stop_gateway')
      running.value = false
      pid.value = null
      notify('Gateway 已停止', 'info')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      notify(`Gateway 停止失败: ${msg}`, 'error')
    }
    loading.value = false
  }

  async function checkStatus() {
    try {
      const status = await invoke<boolean>('gateway_status')
      running.value = status
    } catch (error) {
      console.error('[Gateway] Status check failed:', error)
      running.value = false
    }
  }

  return {
    running,
    pid,
    loading,
    start,
    stop,
    checkStatus,
  }
})
