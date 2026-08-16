// 把内置封面/海报从 PNG 批量转 WebP（大幅瘦身打包体积）。用法：node scripts/webp-covers.mjs
import sharp from 'sharp'
import { readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const DIRS = ['public/styles', 'public/cases']
const QUALITY = 82
let count = 0
let before = 0
let after = 0

for (const dir of DIRS) {
  let files = []
  try {
    files = await readdir(dir)
  } catch {
    continue
  }
  for (const f of files) {
    if (!/\.png$/i.test(f)) continue
    const src = join(dir, f)
    const out = join(dir, f.replace(/\.png$/i, '.webp'))
    before += (await stat(src)).size
    await sharp(src).webp({ quality: QUALITY }).toFile(out)
    after += (await stat(out)).size
    await unlink(src)
    count++
  }
}

const mb = (n) => (n / 1048576).toFixed(1)
console.log(`✓ 转换 ${count} 张 PNG → WebP：${mb(before)}MB → ${mb(after)}MB（省 ${mb(before - after)}MB）`)
