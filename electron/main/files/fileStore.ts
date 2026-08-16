import { promises as fs } from 'node:fs'
import { join, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { AssetType } from '@shared/types'

let DATA_DIR = ''

export function initFileStore(dataDir: string): void {
  DATA_DIR = dataDir
}

export function dataDir(): string {
  if (!DATA_DIR) throw new Error('FileStore 未初始化')
  return DATA_DIR
}

const toRel = (abs: string): string => relative(DATA_DIR, abs).split(sep).join('/')
const toAbs = (rel: string): string => (isAbsolute(rel) ? rel : join(DATA_DIR, rel))

export const paths = {
  assetDir: (projectId: string, type: AssetType, assetId: string): string =>
    join(DATA_DIR, 'projects', projectId, 'assets', `${type}s`, assetId),
  shotImageDir: (projectId: string, shotId: string): string =>
    join(DATA_DIR, 'projects', projectId, 'storyboards', shotId),
  shotVideoDir: (projectId: string, shotId: string): string =>
    join(DATA_DIR, 'projects', projectId, 'videos', shotId)
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
}

function extFromUrl(url: string, fallback: string): string {
  if (url.startsWith('data:')) {
    const header = url.slice(5, url.indexOf(','))
    const mime = header.split(';')[0]
    return MIME_EXT[mime] ?? fallback
  }
  const clean = url.split('?')[0]
  const m = clean.match(/\.([a-z0-9]{2,4})$/i)
  return m ? m[1].toLowerCase() : fallback
}

/** 把一个输出（http/https/data/file URL）落盘到 destDir/baseName.<ext>，返回相对 dataDir 的路径 */
export async function saveFromUrl(
  url: string,
  destDir: string,
  baseName: string,
  fallbackExt = 'png'
): Promise<string> {
  await ensureDir(destDir)
  const ext = extFromUrl(url, fallbackExt)
  const destAbsPath = join(destDir, `${baseName}.${ext}`)
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    const meta = url.slice(5, comma)
    const data = url.slice(comma + 1)
    const isB64 = meta.includes('base64')
    const buf = isB64 ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data), 'utf8')
    await fs.writeFile(destAbsPath, buf)
  } else if (url.startsWith('file://')) {
    const src = decodeURIComponent(url.replace('file://', ''))
    await fs.copyFile(src, destAbsPath)
  } else {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`下载失败 ${res.status}: ${url}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(destAbsPath, buf)
  }
  return toRel(destAbsPath)
}

export async function readFileAbs(rel: string): Promise<Buffer> {
  return fs.readFile(toAbs(rel))
}

async function copyFromRoot(rootDir: string, rel: string, destination: string): Promise<void> {
  const root = resolve(rootDir)
  const source = resolve(root, rel)
  const fromRoot = relative(root, source)
  if (!rel || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new Error('无效的媒体文件路径')
  }
  const stat = await fs.stat(source)
  if (!stat.isFile()) throw new Error('媒体文件不存在')
  await ensureDir(dirname(destination))
  await fs.copyFile(source, destination)
}

/** 将应用数据目录中的媒体复制到用户选择的位置。 */
export async function exportFile(rel: string, destination: string): Promise<void> {
  await copyFromRoot(dataDir(), rel, destination)
}

/** 将随应用发布的案例图、风格图复制到用户选择的位置。 */
export async function exportBundledFile(rootDir: string, rel: string, destination: string): Promise<void> {
  await copyFromRoot(rootDir, rel, destination)
}

export async function removeProjectDir(projectId: string): Promise<void> {
  const dir = join(DATA_DIR, 'projects', projectId)
  await fs.rm(dir, { recursive: true, force: true })
}

export { toAbs as absPath, toRel as relPath }
