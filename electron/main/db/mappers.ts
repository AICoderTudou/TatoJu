import type {
  Project,
  Script,
  Episode,
  Scene,
  SceneDialogue,
  Beat,
  SceneElement,
  Shot,
  Asset,
  AssetImage,
  ShotImage,
  ShotVideo,
  Generation
} from '@shared/types'
import { normalizeCameraMove } from '@shared/types'

function parseDialogues(v: unknown): SceneDialogue[] | null {
  if (typeof v !== 'string' || !v) return null
  try {
    const arr = JSON.parse(v)
    return Array.isArray(arr) ? (arr as SceneDialogue[]) : null
  } catch {
    return null
  }
}

function parseNumArray(v: unknown): number[] | null {
  if (typeof v !== 'string' || !v) return null
  try {
    const arr = JSON.parse(v)
    return Array.isArray(arr) ? (arr as number[]) : null
  } catch {
    return null
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const toProject = (r: any): Project => ({
  id: r.id,
  name: r.name,
  genreDefault: r.genre_default ?? null,
  aspectRatio: r.aspect_ratio,
  styleRef: r.style_ref ?? null,
  styleBible: r.style_bible ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})

export const toScript = (r: any): Script => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title ?? null,
  source: r.source,
  rawText: r.raw_text ?? null,
  outline: r.outline ?? null,
  status: r.status ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})

export const toEpisode = (r: any): Episode => ({
  id: r.id,
  scriptId: r.script_id,
  idx: r.idx,
  title: r.title ?? null,
  synopsis: r.synopsis ?? null
})

export const toScene = (r: any): Scene => ({
  id: r.id,
  episodeId: r.episode_id,
  idx: r.idx,
  slugline: r.slugline ?? null,
  location: r.location ?? null,
  timeOfDay: r.time_of_day ?? null,
  description: r.description ?? null,
  dialogues: parseDialogues(r.dialogues),
  sceneGoal: r.scene_goal ?? null,
  valueShift: r.value_shift ?? null,
  targetDurationSec: r.target_duration_sec ?? null
})

export const toBeat = (r: any): Beat => ({
  id: r.id,
  sceneId: r.scene_id,
  idx: r.idx,
  summary: r.summary ?? null,
  beatType: r.beat_type ?? null,
  valueShift: r.value_shift ?? null,
  dialogueRefs: parseNumArray(r.dialogue_refs)
})

export const toSceneElement = (r: any): SceneElement => ({
  id: r.id,
  sceneId: r.scene_id,
  idx: r.idx,
  category: r.category,
  name: r.name,
  assetId: r.asset_id ?? null,
  note: r.note ?? null
})

export const toShot = (r: any): Shot => ({
  id: r.id,
  sceneId: r.scene_id,
  idx: r.idx,
  shotSize: r.shot_size ?? null,
  cameraAngle: r.camera_angle ?? null,
  cameraMove: normalizeCameraMove(r.camera_move),
  durationSec: r.duration_sec ?? null,
  dialogue: r.dialogue ?? null,
  action: r.action ?? null,
  storyboardPrompt: r.storyboard_prompt ?? null,
  videoPrompt: r.video_prompt ?? null,
  beatId: r.beat_id ?? null,
  lens: r.lens ?? null,
  subjectInFrame: r.subject_in_frame ?? null,
  screenDirection: r.screen_direction ?? null,
  eyeline: r.eyeline ?? null,
  axisSide: r.axis_side ?? null,
  soundType: r.sound_type ?? null,
  audioCue: r.audio_cue ?? null,
  continuityNotes: r.continuity_notes ?? null,
  dialogueRefs: parseNumArray(r.dialogue_refs)
})

export const toAsset = (r: any): Asset => ({
  id: r.id,
  projectId: r.project_id,
  type: r.type,
  name: r.name,
  description: r.description ?? null,
  t2iPrompt: r.t2i_prompt ?? null,
  confirmed: r.confirmed ?? 0,
  createdAt: r.created_at
})

export const toAssetImage = (r: any): AssetImage => ({
  id: r.id,
  assetId: r.asset_id,
  generationId: r.generation_id ?? null,
  filePath: r.file_path,
  isReference: r.is_reference,
  view: r.view ?? null,
  createdAt: r.created_at
})

export const toShotImage = (r: any): ShotImage => ({
  id: r.id,
  shotId: r.shot_id,
  generationId: r.generation_id ?? null,
  filePath: r.file_path,
  isSelected: r.is_selected,
  createdAt: r.created_at
})

export const toShotVideo = (r: any): ShotVideo => ({
  id: r.id,
  shotId: r.shot_id,
  generationId: r.generation_id ?? null,
  filePath: r.file_path,
  isSelected: r.is_selected,
  createdAt: r.created_at
})

export const toGeneration = (r: any): Generation => ({
  id: r.id,
  projectId: r.project_id ?? null,
  kind: r.kind,
  provider: r.provider ?? null,
  model: r.model ?? null,
  params: r.params ?? null,
  seed: r.seed ?? null,
  externalTaskId: r.external_task_id ?? null,
  status: r.status,
  inputs: r.inputs ?? null,
  outputPaths: r.output_paths ?? null,
  error: r.error ?? null,
  cost: r.cost ?? null,
  refKind: r.ref_kind ?? null,
  refId: r.ref_id ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})
