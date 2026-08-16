import type { LLMProvider, ImageProvider, VideoProvider } from '@shared/types'
import { getSettings, getSecretPlain } from '../secrets/store'
import { MockLLMProvider } from './llm/mock'
import { QwenLLMProvider } from './llm/qwen'
import { MockImageProvider, MockVideoProvider } from './mock/mockGen'
import { RunningHubAiAppProvider } from './image/runninghubAiApp'
import { SeedanceProvider } from './video/seedance'

// SELFTEST 强制全 mock：不烧生图/生视频额度，也不依赖真实 key（自测专用）。
// 正常运行不回退 mock：缺少 Key 时直接提示用户前往「全局设置」配置。
const FORCE_MOCK = process.env.SELFTEST === '1'

const mockLLM = new MockLLMProvider()
const mockImage = new MockImageProvider()
const mockVideo = new MockVideoProvider()

export function getLLM(): LLMProvider {
  if (FORCE_MOCK) return mockLLM
  const key = getSecretPlain('qwen')
  if (!key) throw new Error('未配置 阿里百炼 API Key，请在「全局设置」中填写后再试')
  return new QwenLLMProvider(key, getSettings().llmModel)
}

export function getImageProvider(): ImageProvider {
  if (FORCE_MOCK) return mockImage
  // 生图固定直连 RunningHub 工作流
  const key = getSecretPlain('runninghub')
  if (!key) throw new Error('未配置 RunningHub API Key，请在「全局设置」中填写后再试')
  return new RunningHubAiAppProvider(key)
}

export function getVideoProvider(): VideoProvider {
  if (FORCE_MOCK) return mockVideo
  const key = getSecretPlain('seedance')
  if (!key) throw new Error('视频生成暂未开放（未配置视频服务）')
  return new SeedanceProvider(key)
}

export function isMockMode(): boolean {
  return FORCE_MOCK
}
