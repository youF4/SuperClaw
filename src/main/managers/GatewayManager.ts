/**
 * Gateway 管理器（声明式）
 * 
 * 使用声明式配置管理 Gateway 进程
 */

import { fork, ChildProcess } from 'child_process'
import { createLogger } from '../logger'
import { gatewayConfig } from '../config/gateway.config'

const log = createLogger('Gateway')

/**
 * Gateway 状态
 */
export type GatewayStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

/**
 * Gateway 状态映射
 */
const statusMessages: Record<GatewayStatus, string> = {
  stopped: 'Gateway 已停止',
  starting: 'Gateway 启动中...',
  running: 'Gateway 运行中',
  stopping: 'Gateway 停止中...',
  error: 'Gateway 出错'
}

/**
 * Gateway 管理器
 */
export class GatewayManager {
  private process: ChildProcess | null = null
  private status: GatewayStatus = 'stopped'
  private isDev: boolean

  constructor(isDev: boolean) {
    this.isDev = isDev
  }

  /**
   * 状态（只读）
   */
  get Status(): GatewayStatus {
    return this.status
  }

  /**
   * 是否运行中
   */
  get isRunning(): boolean {
    return this.process !== null && !this.process.killed
  }

  /**
   * 启动 Gateway
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('Gateway 已在运行')
      return
    }

    this.status = 'starting'
    log.info(statusMessages.starting)

    // 使用配置获取路径
    const openclawDir = gatewayConfig.openclawDir.get(this.isDev)
    const stateDir = gatewayConfig.stateDir.ensure()
    const entryFile = join(openclawDir, gatewayConfig.process.command)

    // 使用配置启动进程
    this.process = fork(entryFile, gatewayConfig.process.getArgs(), {
      cwd: openclawDir,
      env: gatewayConfig.process.getEnv(stateDir),
      stdio: 'pipe'
    })

    // 声明式事件处理
    this.setupProcessHandlers()

    this.status = 'running'
    log.info(statusMessages.running)
  }

  /**
   * 停止 Gateway
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      log.warn('Gateway 未运行')
      return
    }

    this.status = 'stopping'
    log.info(statusMessages.stopping)

    this.process!.kill('SIGTERM')
    this.process = null

    this.status = 'stopped'
    log.info(statusMessages.stopped)
  }

  /**
   * 重启 Gateway
   */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  /**
   * 设置进程事件处理器（声明式）
   */
  private setupProcessHandlers(): void {
    if (!this.process) return

    // 使用对象映射替代 if-else
    const handlers = {
      stdout: (data: Buffer) => log.info(`[openclaw] ${data.toString().trim()}`),
      stderr: (data: Buffer) => log.error(`[openclaw] ${data.toString().trim()}`),
      exit: (code: number | null) => {
        this.status = code === 0 ? 'stopped' : 'error'
        this.process = null
        log.warn(`Gateway 已退出，退出码: ${code}`)
      },
      error: (err: Error) => {
        this.status = 'error'
        log.error('Gateway 进程错误', err)
      }
    }

    // 声明式绑定
    this.process.stdout?.on('data', handlers.stdout)
    this.process.stderr?.on('data', handlers.stderr)
    this.process.on('exit', handlers.exit)
    this.process.on('error', handlers.error)
  }
}

/**
 * 引入 join（避免顶部导入冲突）
 */
import { join } from 'path'
