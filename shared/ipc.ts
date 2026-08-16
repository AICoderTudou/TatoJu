import type {
  Project,
  Script,
  Episode,
  Scene,
  Shot,
  Beat,
  SceneElement,
  Asset,
  AssetImage,
  ShotImage,
  ShotVideo,
  Generation,
  AppSettings,
  SecretKey,
  ScriptGenParams,
  GenProgressEvent,
  GenStreamEvent,
  StyleBible
} from './types'

export interface ScriptTree {
  script: Script
  episodes: (Episode & { scenes: (Scene & { shots: Shot[] })[] })[]
}

export type AssetWithCount = Asset & { imageCount: number; referenceCount: number; cover: string | null }

/** 连续性校验告警（纯代码校验，分镜板展示） */
export interface ContinuityWarning {
  level: 'high' | 'warn'
  code: string
  message: string
  shotIdx?: number
}
export type ShotRefAsset = Asset & { cover: string | null; hasImage: boolean }

export type MediaKind = 'assetImage' | 'shotImage' | 'video'
export interface ProjectMediaItem {
  id: string
  kind: MediaKind
  filePath: string
  label: string
  sub: string
  isReference: boolean
  isSelected: boolean
  createdAt: number
}

export interface SaveFileResult {
  canceled: boolean
  filePath?: string
}

export type FileScope = 'data' | 'app'

// window.api 的类型契约 —— preload 实现，renderer 消费
export interface Api {
  project: {
    create(input: { name: string; genreDefault?: string; aspectRatio?: string }): Promise<Project>
    list(): Promise<Project[]>
    get(id: string): Promise<Project | null>
    update(id: string, patch: Partial<Pick<Project, 'name' | 'genreDefault' | 'aspectRatio'>>): Promise<Project>
    remove(id: string): Promise<{ ok: true }>
    genStyleBible(id: string, ref: string): Promise<Project>
    saveStyleBible(id: string, bible: StyleBible, ref?: string): Promise<Project>
  }
  settings: {
    get(): Promise<AppSettings>
    update(patch: Partial<AppSettings>): Promise<AppSettings>
    setSecret(key: SecretKey, value: string): Promise<{ ok: true }>
    clearSecret(key: SecretKey): Promise<{ ok: true }>
  }
  sys: {
    /** 用系统默认浏览器打开受信任的 http/https 外链 */
    openExternal(url: string): Promise<void>
  }
  script: {
    generate(projectId: string, params: ScriptGenParams): Promise<ScriptTree>
    parseUpload(projectId: string, input: { title?: string; text: string }): Promise<ScriptTree>
    importFile(projectId: string, filePath: string): Promise<ScriptTree>
    getTree(projectId: string): Promise<ScriptTree | null>
    updateScene(sceneId: string, patch: Partial<Scene>): Promise<Scene>
    updateEpisode(episodeId: string, patch: Partial<Episode>): Promise<Episode>
  }
  asset: {
    extract(projectId: string): Promise<Asset[]>
    list(projectId: string): Promise<Asset[]>
    listWithCounts(projectId: string): Promise<AssetWithCount[]>
    get(id: string): Promise<(Asset & { images: AssetImage[] }) | null>
    create(input: { projectId: string; type: Asset['type']; name: string; description?: string; t2iPrompt?: string }): Promise<Asset>
    update(id: string, patch: Partial<Pick<Asset, 'name' | 'description' | 't2iPrompt'>>): Promise<Asset>
    remove(id: string): Promise<{ ok: true }>
    setReference(imageId: string, isReference: boolean): Promise<{ ok: true }>
    setConfirmed(id: string, confirmed: boolean): Promise<{ ok: true }>
    confirmAll(projectId: string): Promise<{ ok: true }>
  }
  shot: {
    breakdown(sceneId: string): Promise<Shot[]>
    breakdownSheet(sceneId: string): Promise<{ elements: SceneElement[]; beats: Beat[] }>
    shotList(sceneId: string): Promise<Shot[]>
    beats(sceneId: string): Promise<Beat[]>
    sceneElements(sceneId: string): Promise<SceneElement[]>
    continuityCheck(sceneId: string): Promise<ContinuityWarning[]>
    listByScene(sceneId: string): Promise<Shot[]>
    update(id: string, patch: Partial<Shot>): Promise<Shot>
    remove(id: string): Promise<{ ok: true }>
    images(shotId: string): Promise<ShotImage[]>
    videos(shotId: string): Promise<ShotVideo[]>
    selectImage(shotId: string, imageId: string): Promise<{ ok: true }>
    selectVideo(shotId: string, videoId: string): Promise<{ ok: true }>
    assetRefs(shotId: string): Promise<Asset[]>
    assetRefsDetailed(shotId: string): Promise<ShotRefAsset[]>
    suggestAssets(shotId: string): Promise<Asset[]>
    addAssetRef(shotId: string, assetId: string): Promise<{ ok: true }>
    removeAssetRef(shotId: string, assetId: string): Promise<{ ok: true }>
    genStoryboardPrompt(shotId: string): Promise<Shot>
    genVideoPrompt(shotId: string): Promise<Shot>
  }
  gen: {
    imageForAsset(assetId: string): Promise<Generation>
    imageForShot(shotId: string): Promise<Generation>
    videoForShot(shotId: string): Promise<Generation>
    list(projectId: string): Promise<Generation[]>
    retry(generationId: string): Promise<Generation>
    cancel(generationId: string): Promise<{ ok: true }>
    onProgress(cb: (evt: GenProgressEvent) => void): () => void
    onStream(cb: (evt: GenStreamEvent) => void): () => void
  }
  resource: {
    media(projectId: string): Promise<ProjectMediaItem[]>
  }
  style: {
    covers(): Promise<Record<string, string>>
    genCover(id: string): Promise<{ id: string; relPath: string }>
  }
  home: {
    /** 生成首页案例海报（临时入口，验收后可移除 UI 按钮） */
    genPoster(id: string): Promise<{ id: string; relPath: string }>
  }
  win: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<boolean>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
    onMaximizeChange(cb: (maximized: boolean) => void): () => void
  }
  fileUrl(relPath: string): Promise<string>
  saveFile(relPath: string, suggestedName?: string, scope?: FileScope): Promise<SaveFileResult>
}
