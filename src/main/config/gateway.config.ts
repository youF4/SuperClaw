/**
 * Gateway 配置
 * 
 * 声明式地定义 Gateway 行为
 */

import { join } from 'path'
import { app } from 'electron'

/**
 * Gateway 配置定义
 */
export const gatewayConfig = {
  /**
   * OpenClaw 目录
   */
  openclawDir: {
    dev: join(app.getAppPath(), '..', 'openclaw-dist'),
    prod: join(process.resourcesPath, 'openclaw'),
    
    get: (isDev: boolean) => isDev 
      ? gatewayConfig.openclawDir.dev 
      : gatewayConfig.openclawDir.prod
  },

  /**
   * 状态目录
   */
  stateDir: {
    path: join(app.getPath('userData'), 'data', 'openclaw'),
    
    ensure: () => {
      const { mkdirSync } = require('fs')
      mkdirSync(gatewayConfig.stateDir.path, { recursive: true })
      return gatewayConfig.stateDir.path
    }
  },

  /**
   * Gateway 进程配置
   */
  process: {
    command: 'openclaw.mjs',
    args: ['gateway', '--allow-unconfigured', '--port'],
    port: 22333,
    
    getArgs: () => [
      ...gatewayConfig.process.args,
      String(gatewayConfig.process.port)
    ],
    
    getEnv: (stateDir: string) => ({
      ...process.env,
      OPENCLAW_STATE_DIR: stateDir
    })
  },

  /**
   * 默认 Gateway 配置
   */
  defaults: {
    host: '127.0.0.1',
    port: 18789,
    autoStart: true
  }
} as const

/**
 * Gateway 配置类型
 */
export type GatewayConfig = typeof gatewayConfig
