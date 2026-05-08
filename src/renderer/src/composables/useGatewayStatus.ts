/**
 * Gateway 状态管理组合式函数
 */

import { ref, computed } from 'vue'

export type GatewayStatus = 'stopped' | 'running' | 'error' | 'checking'

export function useGatewayStatus() {
  const status = ref<GatewayStatus>('checking')
  const lastChecked = ref<number>(0)

  const isRunning = computed(() => status.value === 'running')
  const isStopped = computed(() => status.value === 'stopped')
  const isError = computed(() => status.value === 'error')

  async function checkStatus() {
    status.value = 'checking'
    try {
      const running = await window.electronAPI.gateway.status()
      status.value = running ? 'running' : 'stopped'
    } catch (e) {
      status.value = 'error'
    }
    lastChecked.value = Date.now()
  }

  async function start() {
    await window.electronAPI.gateway.start()
    await checkStatus()
  }

  async function stop() {
    await window.electronAPI.gateway.stop()
    await checkStatus()
  }

  return {
    status,
    lastChecked,
    isRunning,
    isStopped,
    isError,
    checkStatus,
    start,
    stop
  }
}
