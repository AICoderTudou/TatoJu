import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { STYLE_TEMPLATES } from '@shared/styleTemplates'
import { rhGenerateImage } from '../providers/image/runninghubAiApp'
import { getSecretPlain } from '../secrets/store'

// 风格封面 = 内置素材，存到项目 public/styles/，随打包分发（dev 下 cwd/public 可写）。
// 前端用相对路径 ./styles/{id}.png 加载（vite 把 public 拷进产物），无需运行时映射。
const stylesDir = (): string => join(app.getAppPath(), 'public', 'styles')

export const styleCoverService = {
  // 前端按相对路径直接加载封面，这里无需返回映射
  covers(): Promise<Record<string, string>> {
    return Promise.resolve({})
  },

  async genCover(id: string): Promise<{ id: string; relPath: string }> {
    const t = STYLE_TEMPLATES.find((x) => x.id === id)
    if (!t) throw new Error('风格不存在')
    const key = getSecretPlain('runninghub')
    if (!key) throw new Error('未配置 RunningHub Key（设置里填）')
    const urls = await rhGenerateImage(key, {
      prompt: t.coverPrompt,
      aspectRatio: '16:9',
      resolution: '1k'
    })
    if (!urls.length) throw new Error('未返回图片')
    const res = await fetch(urls[0])
    if (!res.ok) throw new Error(`下载封面失败 ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.mkdir(stylesDir(), { recursive: true })
    // 封面统一存 WebP（瘦身打包体积）。sharp 懒加载：只在真正重生成封面时才加载原生模块，
    // 启动/正常使用完全不依赖它（封面已是预置 WebP，展示无需 sharp）。
    const sharp = (await import('sharp')).default
    const webp = await sharp(buf).webp({ quality: 82 }).toBuffer()
    await fs.writeFile(join(stylesDir(), `${id}.webp`), webp)
    return { id, relPath: `styles/${id}.webp` }
  }
}
