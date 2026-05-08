/**
 * IPC 处理入口
 */

import { registerCacheIPC } from './cache'
import { registerConfigIPC } from './config'
import { createLogger } from '../logger'

const log = createLogger('IPC')

/**
 * 注册所有 IPC 处理
 */
export function registerAllIPC() {
  log.info('注册所有 IPC 处理...')
  
  registerCacheIPC()
  registerConfigIPC()
  
  log.info('所有 IPC 处理已注册')
}
