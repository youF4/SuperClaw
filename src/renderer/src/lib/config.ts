/**
 * SuperClaw 全局配置
 * 将硬编码的常量集中管理
 */

/** Gateway HTTP API 地址 */
export const GATEWAY_HTTP_URL = 'http://127.0.0.1:22333'

/** Gateway WebSocket 地址 */
export const GATEWAY_WS_URL = 'ws://127.0.0.1:22333/ws'

/** Gateway 端口 */
export const GATEWAY_PORT = 22333

/** Gateway 健康检查超时时间（秒） */
export const GATEWAY_HEALTH_TIMEOUT = 10

/** 重连基础延迟（毫秒） */
export const WS_RECONNECT_BASE_DELAY = 1000

/** 重连最大延迟（毫秒） */
export const WS_RECONNECT_MAX_DELAY = 30000
