import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { HOME_CASES } from '@shared/homeCases'
import { rhGenerateImage } from '../providers/image/runninghubAiApp'
import { getSecretPlain } from '../secrets/store'

// 首页案例海报 = 内置素材，存到项目 public/cases/，随打包分发。
// 前端用相对路径 ./cases/{id}.png 加载（vite 把 public 拷进产物）。
const casesDir = (): string => join(app.getAppPath(), 'public', 'cases')

export const homePosterService = {
  async genPoster(id: string): Promise<{ id: string; relPath: string }> {
    const c = HOME_CASES.find((x) => x.id === id)
    if (!c) throw new Error('案例不存在')
    const key = getSecretPlain('runninghub')
    if (!key) throw new Error('未配置 RunningHub Key（设置里填）')
    const urls = await rhGenerateImage(key, {
      prompt: c.posterPrompt,
      aspectRatio: '2:3',
      resolution: '1k'
    })
    if (!urls.length) throw new Error('未返回图片')
    const res = await fetch(urls[0])
    if (!res.ok) throw new Error(`下载海报失败 ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.mkdir(casesDir(), { recursive: true })
    // 海报统一存 WebP；sharp 懒加载，启动/正常使用不依赖原生模块
    const sharp = (await import('sharp')).default
    const webp = await sharp(buf).webp({ quality: 82 }).toBuffer()
    await fs.writeFile(join(casesDir(), `${id}.webp`), webp)
    return { id, relPath: `cases/${id}.webp` }
  }
}
