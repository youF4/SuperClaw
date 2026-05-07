import { ref, onMounted, type Ref } from 'vue'
import { useGatewayStore } from '@/stores/gateway'
import type { GatewayResponse } from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

/**
 * 声明式的 Gateway API 数据加载
 *
 * 封装了 loading / error / 空数据三态，消除重复的
 *   loading.value = true; const res = await ...; if(res.ok) {...} else {notify()}; loading.value = false
 *
 * @example
 *   const { data, loading } = useGatewayData(() => gatewayApi.devices.list())
 *   // data 自动为 Device[] | null, loading 自动管理
 *   // 如果再传 { onError: msg => notify(msg) } 自动通知错误
 */
export function useGatewayData<T>(
  fetcher: () => Promise<GatewayResponse<T>>,
  options?: {
    /** 创建后立即加载 */
    immediate?: boolean
    /** 加载失败时的回调 */
    onError?: (msg: string) => void
    /** 把网关未运行也视为错误 */
    requireGateway?: boolean
  }
) {
  const data: Ref<T | null> = ref(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<T | null> {
    loading.value = true
    error.value = null
    // 不立清 data，保留旧数据直到新数据到达，避免 UI 闪烁

    const res = await fetcher()
    if (res.ok && res.result !== undefined) {
      data.value = res.result as T
    } else {
      const msg = res.error || '未知错误'
      error.value = msg
      if (options?.onError) options.onError(msg)
    }

    loading.value = false
    return data.value
  }

  if (options?.immediate) load()

  return { data, loading, error, load }
}

/**
 * 页面级 composable：自动检查 Gateway 状态 + 按需加载数据
 *
 * 消除遍布所有页面中的重复代码：
 *   onMounted(async () => {
 *     await gatewayStore.checkStatus()
 *     if (gatewayStore.running) await loadData()
 *   })
 */
export function useGatewayPage(loadFn?: () => Promise<void>) {
  const gatewayStore = useGatewayStore()

  onMounted(async () => {
    await gatewayStore.checkStatus()
    if (gatewayStore.running && loadFn) {
      try {
        await loadFn()
      } catch (e) {
        notify(`加载失败: ${e}`, 'error')
      }
    }
  })

  return { gatewayStore }
}
