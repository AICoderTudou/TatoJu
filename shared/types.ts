// 主进程 / 渲染进程共享类型 —— 单一事实源（DTO、枚举、Provider 接口、IPC 约定）

// ---------- 基础枚举 ----------
export type GenStatus = 'queued' | 'running' | 'success' | 'failed' | 'canceled'
export type GenKind = 'llm' | 'image' | 'video'
export type AssetType = 'character' | 'scene' | 'prop'
export type ScriptSource = 'generated' | 'uploaded'

// ---------- Provider 抽象 ----------
export interface ImageInput {
  path?: string
  url?: string
  base64?: string
}

export interface LLMMessage {
  role: 'user' | 'assistant'
  text?: string
  images?: ImageInput[]
}

export interface LLMChatRequest {
  system?: string
  messages: LLMMessage[]
  /** 传入则要求结构化 JSON 输出 */
  json?: boolean
  temperature?: number
  maxTokens?: number
  /** 任务标签：真实 provider 忽略，mock 据此返回确定性结构化输出 */
  task?: string
  /** 覆盖默认模型 id（如剧本功能用 deepseek-v4-flash）；mock 忽略 */
  model?: string
  /** 开启流式输出（仅主进程内使用，不经 IPC） */
  stream?: boolean
  /** 流式增量回调，参数为"累计全文"（仅主进程内使用，不经 IPC） */
  onChunk?: (fullText: string) => void
}

export interface LLMChatResult {
  text: string
  json?: unknown
  usage?: { in: number; out: number }
}

export interface LLMProvider {
  readonly name: string
  chat(req: LLMChatRequest): Promise<LLMChatResult>
}

export interface ImageGenRequest {
  prompt: string
  negativePrompt?: string
  refImages?: ImageInput[]
  size?: string
  /** 画幅比例（如 9:16 / 16:9 / 1:1）；provider 优先用它，其次从 size 反推 */
  aspectRatio?: string
  n?: number
  seed?: number
  // RunningHub 专用
  workflowId?: string
  nodeOverrides?: { nodeId: string; fieldName: string; fieldValue: unknown }[]
}

export interface VideoGenRequest {
  firstFrame: ImageInput
  prompt: string
  refImages?: ImageInput[]
  durationSec?: number
  aspectRatio?: string
  resolution?: string
}

export interface GenSubmitResult {
  externalTaskId: string
}
export interface GenPollResult {
  status: GenStatus
  outputUrls?: string[]
  error?: string
  progress?: number
}

export interface ImageProvider {
  readonly name: string
  submit(req: ImageGenRequest): Promise<GenSubmitResult>
  poll(externalTaskId: string): Promise<GenPollResult>
}

export interface VideoProvider {
  readonly name: string
  submit(req: VideoGenRequest): Promise<GenSubmitResult>
  poll(externalTaskId: string): Promise<GenPollResult>
}

// ---------- 数据实体（DTO，与 SQLite 行对应） ----------
export interface Project {
  id: string
  name: string
  genreDefault: string | null
  aspectRatio: string
  /** 参考影片 / 视觉关键词（风格圣经输入） */
  styleRef: string | null
  /** 风格圣经 JSON 文本（6 区块影像标准） */
  styleBible: string | null
  createdAt: number
  updatedAt: number
}

export interface StyleBible {
  reference?: string
  visualStyle?: string
  colorGrading?: string
  lighting?: string
  cameraLanguage?: string
  postTexture?: string
  rhythmEditing?: string
}

export interface Script {
  id: string
  projectId: string
  title: string | null
  source: ScriptSource
  rawText: string | null
  /** JSON 文本：大纲（题材/钩子/反转/主线） */
  outline: string | null
  status: string | null
  createdAt: number
  updatedAt: number
}

export interface Episode {
  id: string
  scriptId: string
  idx: number
  title: string | null
  synopsis: string | null
}

/** 结构化对白：上传剧本时逐句保真抽取，下游拆分镜按行精确分配 */
export interface SceneDialogue {
  character: string
  text: string
  /** 表演提示 / 旁白标注（如 合上书 / V.O. / 画外音），可选 */
  note?: string
}

export interface Scene {
  id: string
  episodeId: string
  idx: number
  slugline: string | null
  location: string | null
  timeOfDay: string | null
  /** 动作 / 旁白（不含对白） */
  description: string | null
  /** 结构化对白列表（无则 null；多见于上传剧本） */
  dialogues?: SceneDialogue[] | null
  /** 本场谁要什么（场景驱动力） */
  sceneGoal?: string | null
  /** 本场价值转折，如「安全→暴露」 */
  valueShift?: string | null
  /** 本场目标总时长(秒)，用作排镜时长预算 */
  targetDurationSec?: number | null
}

/** 节拍：场景内"动作-反应"的最小戏剧单元（排镜以 Beat 为骨） */
export interface Beat {
  id: string
  sceneId: string
  idx: number
  summary: string | null
  beatType: string | null // setup/turn/reaction/reveal/button
  valueShift: string | null
  /** 本拍涉及的 SceneDialogue 句子 index（可追溯） */
  dialogueRefs?: number[] | null
}

/** 场景拆解表元素（Breakdown Sheet：按场景标记可拍元素，用于备料/一致性回链） */
export interface SceneElement {
  id: string
  sceneId: string
  idx: number
  category: string // cast/extras/prop/setDressing/wardrobe/makeup/vehicle/stunt/sfx/vfx/sound/specialEquip/note
  name: string
  /** 回链已确认的 character/scene/prop 资源（可空） */
  assetId?: string | null
  note?: string | null
}

export interface Shot {
  id: string
  sceneId: string
  idx: number
  shotSize: string | null
  cameraAngle: string | null
  cameraMove: string | null
  durationSec: number | null
  dialogue: string | null
  action: string | null
  storyboardPrompt: string | null
  videoPrompt: string | null
  // —— 电影级字段（旗舰拆解；老数据为 null，向后兼容）——
  /** 所属节拍 id（以 Beat 为骨） */
  beatId?: string | null
  /** 焦段：24mm广角/35mm/50mm/85mm人像/100mm长焦 */
  lens?: string | null
  /** 画面主体：这个景别里装谁/什么 */
  subjectInFrame?: string | null
  /** 主体朝向/运动方向，如「面朝画右」 */
  screenDirection?: string | null
  /** 视线方向，如「看向画左的对方」（反打视线匹配） */
  eyeline?: string | null
  /** 180度轴线侧：L/R/N(中性) */
  axisSide?: string | null
  /** 声音类型：sync同期/VO旁白/OS画外/MOS无声 */
  soundType?: string | null
  /** 本镜音效层 */
  audioCue?: string | null
  /** 连续性备注（道具状态/与上镜衔接） */
  continuityNotes?: string | null
  /** 本镜承载的 SceneDialogue 句子 index（让长台词可切"说话镜+反应镜"且可回流） */
  dialogueRefs?: number[] | null
}

// ---------- 拆解/排镜枚举（供 UI 下拉与提示词） ----------
export const BEAT_TYPES = ['setup', 'turn', 'reaction', 'reveal', 'button'] as const
export const BEAT_TYPE_LABELS: Record<string, string> = {
  setup: '铺垫',
  turn: '转折',
  reaction: '反应',
  reveal: '揭示',
  button: '收尾'
}
export const AXIS_SIDES = ['L', 'R', 'N'] as const
export const SOUND_TYPES = ['sync', 'VO', 'OS', 'MOS'] as const
export const SOUND_TYPE_LABELS: Record<string, string> = {
  sync: '同期声',
  VO: '旁白',
  OS: '画外音',
  MOS: '无声'
}
export const LENS_OPTIONS = ['24mm 广角', '35mm', '50mm 标准', '85mm 人像', '100mm 长焦'] as const
export const SCENE_ELEMENT_CATEGORIES = [
  'cast',
  'extras',
  'prop',
  'setDressing',
  'wardrobe',
  'makeup',
  'vehicle',
  'stunt',
  'sfx',
  'vfx',
  'sound',
  'specialEquip',
  'note'
] as const
export const SCENE_ELEMENT_LABELS: Record<string, string> = {
  cast: '角色',
  extras: '群演',
  prop: '道具',
  setDressing: '布景陈设',
  wardrobe: '服装',
  makeup: '妆发',
  vehicle: '载具',
  stunt: '特技',
  sfx: '现场特效',
  vfx: '后期特效',
  sound: '声音',
  specialEquip: '特殊设备',
  note: '备注'
}

export interface Asset {
  id: string
  projectId: string
  type: AssetType
  name: string
  description: string | null
  t2iPrompt: string | null
  /** 是否已确认设定（Stop Rule：确认后再进入下游分镜/视频） */
  confirmed: number
  createdAt: number
}

export interface AssetImage {
  id: string
  assetId: string
  generationId: string | null
  filePath: string
  isReference: number
  view: string | null
  createdAt: number
}

export interface ShotImage {
  id: string
  shotId: string
  generationId: string | null
  filePath: string
  isSelected: number
  createdAt: number
}

export interface ShotVideo {
  id: string
  shotId: string
  generationId: string | null
  filePath: string
  isSelected: number
  createdAt: number
}

export interface Generation {
  id: string
  projectId: string | null
  kind: GenKind
  provider: string | null
  model: string | null
  params: string | null
  seed: number | null
  externalTaskId: string | null
  status: GenStatus
  inputs: string | null
  outputPaths: string | null
  error: string | null
  cost: number | null
  refKind: string | null
  refId: string | null
  createdAt: number
  updatedAt: number
}

// ---------- 设置 ----------
export interface AppSettings {
  llmProvider: 'qwen' | 'doubao' | 'glm' | 'mock'
  llmModel: string
  /** 剧本相关功能（生成/拆解）专用模型，纯文本，默认 deepseek-v4-flash */
  scriptModel: string
  imageProvider: 'runninghub' | 'gptimage' | 'mock'
  videoProvider: 'seedance' | 'mock'
  runninghubWorkflowId: string
  maxConcurrency: number
  defaultAspectRatio: string
  // 这些只读标记表明各 provider 是否已配置 key（明文 key 不下发渲染进程）
  hasQwenKey?: boolean
  hasRunninghubKey?: boolean
  hasGptImageKey?: boolean
  hasSeedanceKey?: boolean
}

export type SecretKey = 'qwen' | 'runninghub' | 'gptimage' | 'seedance'

// ---------- 进度推送事件 ----------
export interface GenProgressEvent {
  generationId: string
  status: GenStatus
  progress?: number
  error?: string
  refKind?: string
  refId?: string
  kind: GenKind
}

// ---------- LLM 流式过程事件（实时"生成过程"浮层用）----------
export interface GenStreamEvent {
  generationId: string
  label: string
  chars: number
  /** 累计输出的尾部预览（最近若干字符） */
  preview: string
  done?: boolean
}

// ---------- 剧本智能体生成参数 ----------
export interface ScriptGenParams {
  genre: string
  episodes: number
  durationSecPerEp: number
  logline?: string
  tone?: string
}

// ---------- 镜头表枚举（供 UI 下拉与 Seedance 拼装） ----------
export const SHOT_SIZES = ['远景', '全景', '中景', '近景', '特写', '大特写'] as const
export const CAMERA_ANGLES = ['平视', '俯拍', '仰拍', '过肩', '主观视角', '航拍'] as const
// 运镜：值用【纯中文】(与 LLM 拆镜输出、prompt 一致，避免下拉因双语值匹配失败而空白)；显示用双语
export const CAMERA_MOVES = ['推', '拉', '摇', '跟', '环绕', '航拍', '手持', '固定'] as const
export const CAMERA_MOVE_LABELS: Record<string, string> = {
  推: '推 Push-in',
  拉: '拉 Pull-out',
  摇: '摇 Pan',
  跟: '跟 Tracking',
  环绕: '环绕 Orbit',
  航拍: '航拍 Aerial',
  手持: '手持 Handheld',
  固定: '固定 Fixed'
}
/** 归一化运镜值：把历史双语值('推 Push-in')或带后缀('推镜')自愈为纯中文枚举值 */
export function normalizeCameraMove(v: string | null | undefined): string | null {
  if (!v) return v ?? null
  const s = String(v).trim()
  if ((CAMERA_MOVES as readonly string[]).includes(s)) return s
  const head = s.split(/[\s/]+/)[0] // '推 Push-in' -> '推'
  if ((CAMERA_MOVES as readonly string[]).includes(head)) return head
  const hit = (CAMERA_MOVES as readonly string[]).find((m) => s.startsWith(m)) // '推镜' -> '推'
  return hit ?? s
}
