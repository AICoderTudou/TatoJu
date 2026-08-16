import type { ProjectMediaItem } from '@shared/ipc'
import { getDb } from '../db/client'

const TYPE_LABEL: Record<string, string> = { character: '角色', scene: '场景', prop: '道具' }

// 资源中心：聚合一个项目下所有已生成的媒体（设定图 / 分镜图 / 视频碎片），便于集中反复查看。
export const resourceService = {
  media(projectId: string): ProjectMediaItem[] {
    const db = getDb()
    const items: ProjectMediaItem[] = []

    const assetImgs = db
      .prepare(
        `SELECT ai.id, ai.file_path, ai.is_reference, ai.created_at, a.name, a.type
         FROM asset_images ai JOIN assets a ON ai.asset_id=a.id
         WHERE a.project_id=?`
      )
      .all(projectId) as any[]
    for (const r of assetImgs) {
      items.push({
        id: r.id,
        kind: 'assetImage',
        filePath: r.file_path,
        label: r.name,
        sub: TYPE_LABEL[r.type] ?? r.type,
        isReference: r.is_reference === 1,
        isSelected: false,
        createdAt: r.created_at
      })
    }

    const shotImgs = db
      .prepare(
        `SELECT si.id, si.file_path, si.is_selected, si.created_at,
                sh.idx AS shot_idx, sc.idx AS scene_idx, e.idx AS ep_idx
         FROM shot_images si
         JOIN shots sh ON si.shot_id=sh.id
         JOIN scenes sc ON sh.scene_id=sc.id
         JOIN episodes e ON sc.episode_id=e.id
         JOIN scripts s ON e.script_id=s.id
         WHERE s.project_id=?`
      )
      .all(projectId) as any[]
    for (const r of shotImgs) {
      items.push({
        id: r.id,
        kind: 'shotImage',
        filePath: r.file_path,
        label: `镜头 ${r.ep_idx}-${r.scene_idx}-${r.shot_idx}`,
        sub: '分镜图',
        isReference: false,
        isSelected: r.is_selected === 1,
        createdAt: r.created_at
      })
    }

    const videos = db
      .prepare(
        `SELECT v.id, v.file_path, v.is_selected, v.created_at,
                sh.idx AS shot_idx, sc.idx AS scene_idx, e.idx AS ep_idx
         FROM shot_videos v
         JOIN shots sh ON v.shot_id=sh.id
         JOIN scenes sc ON sh.scene_id=sc.id
         JOIN episodes e ON sc.episode_id=e.id
         JOIN scripts s ON e.script_id=s.id
         WHERE s.project_id=?`
      )
      .all(projectId) as any[]
    for (const r of videos) {
      items.push({
        id: r.id,
        kind: 'video',
        filePath: r.file_path,
        label: `镜头 ${r.ep_idx}-${r.scene_idx}-${r.shot_idx}`,
        sub: '视频碎片',
        isReference: false,
        isSelected: r.is_selected === 1,
        createdAt: r.created_at
      })
    }

    return items.sort((a, b) => b.createdAt - a.createdAt)
  }
}
