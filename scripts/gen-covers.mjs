// 从 shared/styleTemplates.ts 提取全部封面文生图提示词，生成 docs/风格封面提示词.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const src = readFileSync('shared/styleTemplates.ts', 'utf8')
const COVER_TAIL = 'cinematic film still, no text, no captions, no watermark, 16:10 aspect ratio'

const re = /category: '(\w+)',\s*\n\s*name: '([^']+)',[\s\S]*?coverPrompt: `([\s\S]*?)`/g
const items = []
let m
while ((m = re.exec(src))) {
  items.push({ cat: m[1], name: m[2], cover: m[3].replaceAll('${COVER_TAIL}', COVER_TAIL).trim() })
}

const catName = { real: '真人', '2d': '2D', '3d': '3D' }
const order = ['real', '2d', '3d']
let md = `# 风格库 · 封面文生图提示词（gpt-image-2，16:10，透明或深色底均可）\n\n`
md += `> 共 ${items.length} 个风格。每条可直接复制到 gpt-image-2 生成封面；建议尺寸 1456×816 或 1024×576（16:10/16:9 皆可）。\n\n`

for (const cat of order) {
  const list = items.filter((i) => i.cat === cat)
  md += `\n## ${catName[cat]}（${list.length}）\n\n`
  list.forEach((it, i) => {
    md += `### ${i + 1}. ${it.name}\n\n\`\`\`\n${it.cover}\n\`\`\`\n\n`
  })
}

mkdirSync('docs', { recursive: true })
writeFileSync('docs/风格封面提示词.md', md, 'utf8')
console.log(`已生成 docs/风格封面提示词.md，共 ${items.length} 条`)
