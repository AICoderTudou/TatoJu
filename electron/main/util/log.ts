/* 极简日志 —— 主进程统一前缀，SELFTEST 下也走 stdout 便于无界面验证 */
const ts = (): string => new Date().toISOString().slice(11, 23)

export const log = {
  info: (...a: unknown[]): void => console.log(`[${ts()}]`, ...a),
  warn: (...a: unknown[]): void => console.warn(`[${ts()}] WARN`, ...a),
  error: (...a: unknown[]): void => console.error(`[${ts()}] ERROR`, ...a)
}
