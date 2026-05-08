/**
 * IPC 工具函数
 * 
 * 提供 IPC 调用的超时处理和错误处理
 */

/**
 * 带超时的 Promise 包装
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`操作超时（${ms}ms）`)), ms)
    )
  ])
}

/**
 * IPC 调用包装器（带超时和错误处理）
 */
export async function callIPC<T>(
  promise: Promise<T>,
  options: {
    timeout?: number
    timeoutMessage?: string
    retries?: number
    retryDelay?: number
  } = {}
): Promise<T> {
  const {
    timeout = 10000, // 默认 10 秒超时
    timeoutMessage = '操作超时，请重试',
    retries = 0,
    retryDelay = 1000
  } = options

  let lastError: Error | null = null
  let attempts = 0

  while (attempts <= retries) {
    try {
      const result = await withTimeout(promise, timeout)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // 如果是超时错误且还有重试次数，则重试
      if (lastError.message.includes('超时') && attempts < retries) {
        attempts++
        console.warn(`[IPC] 第 ${attempts} 次重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }
      
      throw lastError
    }
  }

  throw lastError || new Error('未知错误')
}

/**
 * 安全的 IPC 调用（不会抛出异常，返回 null）
 */
export async function safeCallIPC<T>(
  promise: Promise<T>,
  options?: {
    timeout?: number
    retries?: number
    retryDelay?: number
  }
): Promise<T | null> {
  try {
    return await callIPC(promise, options)
  } catch (error) {
    console.error('[IPC] 调用失败:', error)
    return null
  }
}
