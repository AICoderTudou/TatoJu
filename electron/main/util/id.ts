import { randomUUID } from 'node:crypto'

// 用 node 内置 randomUUID，避免 nanoid 纯 ESM 在 CJS 主进程触发 ERR_REQUIRE_ESM。
export function id(prefix = ''): string {
  const u = randomUUID()
  return prefix ? `${prefix}_${u}` : u
}

export const now = (): number => Date.now()
