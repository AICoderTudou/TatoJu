import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { safeStorage } from 'electron'
import type { AppSettings, SecretKey } from '@shared/types'
import { log } from '../util/log'

let DATA_DIR = ''
let settingsCache: SettingsFile | null = null
let secretsCache: Record<string, string> | null = null

interface SettingsFile {
  llmProvider: AppSettings['llmProvider']
  llmModel: string
  scriptModel: string
  imageProvider: AppSettings['imageProvider']
  videoProvider: AppSettings['videoProvider']
  runninghubWorkflowId: string
  maxConcurrency: number
  defaultAspectRatio: string
}

const DEFAULTS: SettingsFile = {
  llmProvider: 'qwen',
  llmModel: 'qwen3-vl-plus',
  scriptModel: 'deepseek-v4-flash',
  imageProvider: 'runninghub',
  videoProvider: 'seedance',
  runninghubWorkflowId: '',
  maxConcurrency: 2,
  defaultAspectRatio: '9:16'
}

const settingsPath = (): string => join(DATA_DIR, 'settings.json')
const secretsPath = (): string => join(DATA_DIR, 'secrets.json')

export async function initSecretsStore(dataDir: string): Promise<void> {
  DATA_DIR = dataDir
  await fs.mkdir(dataDir, { recursive: true })
  try {
    settingsCache = { ...DEFAULTS, ...JSON.parse(await fs.readFile(settingsPath(), 'utf8')) }
  } catch {
    settingsCache = { ...DEFAULTS }
  }
  try {
    secretsCache = JSON.parse(await fs.readFile(secretsPath(), 'utf8'))
  } catch {
    secretsCache = {}
  }
}

function encEnabled(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function getSettings(): AppSettings {
  const s = settingsCache ?? DEFAULTS
  return {
    ...s,
    hasQwenKey: hasSecret('qwen'),
    hasRunninghubKey: hasSecret('runninghub'),
    hasGptImageKey: hasSecret('gptimage'),
    hasSeedanceKey: hasSecret('seedance')
  }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next: SettingsFile = { ...(settingsCache ?? DEFAULTS) }
  for (const k of Object.keys(DEFAULTS) as (keyof SettingsFile)[]) {
    if (patch[k] !== undefined) (next as unknown as Record<string, unknown>)[k] = patch[k]
  }
  settingsCache = next
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
  return getSettings()
}

async function persistSecrets(): Promise<void> {
  await fs.writeFile(secretsPath(), JSON.stringify(secretsCache ?? {}, null, 2), 'utf8')
}

export async function setSecret(key: SecretKey, value: string): Promise<void> {
  if (!secretsCache) secretsCache = {}
  if (!value) {
    delete secretsCache[key]
  } else if (encEnabled()) {
    secretsCache[key] = 'enc:' + safeStorage.encryptString(value).toString('base64')
  } else {
    log.warn('safeStorage 不可用，密钥以 base64 明文降级存储（仅开发环境可接受）')
    secretsCache[key] = 'b64:' + Buffer.from(value, 'utf8').toString('base64')
  }
  await persistSecrets()
}

export async function clearSecret(key: SecretKey): Promise<void> {
  if (secretsCache) delete secretsCache[key]
  await persistSecrets()
}

export function hasSecret(key: SecretKey): boolean {
  return !!(secretsCache && secretsCache[key])
}

/** 仅主进程使用：取明文密钥（绝不经 IPC 下发渲染进程） */
export function getSecretPlain(key: SecretKey): string | null {
  const v = secretsCache?.[key]
  if (!v) return null
  try {
    if (v.startsWith('enc:')) {
      return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64'))
    }
    if (v.startsWith('b64:')) {
      return Buffer.from(v.slice(4), 'base64').toString('utf8')
    }
    return v
  } catch (e) {
    log.error('解密密钥失败', key, e)
    return null
  }
}
