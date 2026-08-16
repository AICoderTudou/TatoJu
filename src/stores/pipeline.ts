import { defineStore } from 'pinia'
import { ref } from 'vue'

// 管线就绪状态：用于侧栏阶段门禁（剧本→资源库→分镜板→视频碎片 串行解锁）
export const usePipelineStore = defineStore('pipeline', () => {
  const hasScript = ref(false)
  const assetCount = ref(0)
  const shotCount = ref(0)

  async function refresh(projectId: string): Promise<void> {
    const tree = await window.api.script.getTree(projectId)
    hasScript.value = !!tree
    let shots = 0
    if (tree) {
      for (const ep of tree.episodes) for (const sc of ep.scenes) shots += sc.shots.length
    }
    shotCount.value = shots
    assetCount.value = (await window.api.asset.list(projectId)).length
  }

  const ALWAYS = new Set(['overview', 'script', 'resources'])
  function unlocked(stage: string): boolean {
    if (ALWAYS.has(stage)) return true
    if (stage === 'assets') return hasScript.value
    if (stage === 'storyboard') return assetCount.value > 0
    if (stage === 'clips') return shotCount.value > 0
    return true
  }
  function lockReason(stage: string): string {
    if (stage === 'assets') return '请先在「剧本」随机生成或上传一部剧本'
    if (stage === 'storyboard') return '请先在「资源库」从剧本提取/创建资源'
    if (stage === 'clips') return '请先在「分镜板」把场景拆出分镜'
    return ''
  }

  return { hasScript, assetCount, shotCount, refresh, unlocked, lockReason }
})
