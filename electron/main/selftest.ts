import { promises as fs } from 'node:fs'
import { getDb } from './db/client'
import { absPath } from './files/fileStore'
import { projectService } from './services/projectService'
import { scriptService } from './services/scriptService'
import { assetService } from './services/assetService'
import { shotService } from './services/shotService'
import { genService } from './services/genService'
import { resourceService } from './services/resourceService'
import { getLLM } from './providers/registry'
import { setLlmStreamEmitter } from './tasks/track'
import { getSettings, updateSettings, setSecret, clearSecret } from './secrets/store'
import { log } from './util/log'

let passed = 0
let failed = 0
function check(name: string, cond: boolean, extra?: unknown): void {
  if (cond) {
    passed++
    log.info(`  ✓ ${name}`)
  } else {
    failed++
    log.error(`  ✗ ${name}`, extra ?? '')
  }
}

async function fileExists(rel: string): Promise<boolean> {
  try {
    await fs.access(absPath(rel))
    return true
  } catch {
    return false
  }
}

async function waitForGen(genId: string, timeoutMs = 30000): Promise<string> {
  const start = Date.now()
  for (;;) {
    const row = getDb().prepare('SELECT status FROM generations WHERE id=?').get(genId) as any
    const st = row?.status
    if (st === 'success' || st === 'failed' || st === 'canceled') return st
    if (Date.now() - start > timeoutMs) return 'timeout'
    await new Promise((r) => setTimeout(r, 300))
  }
}

export async function runSelfTest(): Promise<number> {
  log.info('========== SELFTEST 开始（全 mock，不消耗生图/生视频额度）==========')

  try {
    // 1. 项目 CRUD
    log.info('[1] 项目管理')
    const proj = projectService.create({ name: '自测项目', genreDefault: '都市逆袭' })
    check('创建项目', !!proj.id && proj.name === '自测项目')
    const updated = projectService.update(proj.id, { name: '自测项目(改)' })
    check('更新项目', updated.name === '自测项目(改)')
    check('列出项目', projectService.list().some((p) => p.id === proj.id))

    // 2. 剧本生成 → 大纲/分集/场景
    log.info('[2] 剧本智能体')
    const tree = await scriptService.generate(proj.id, {
      genre: '都市逆袭',
      episodes: 2,
      durationSecPerEp: 60
    })
    check('生成剧本含标题', !!tree.script.title)
    check('生成大纲(JSON)', !!tree.script.outline && tree.script.outline.includes('logline'))
    check('生成分集', tree.episodes.length >= 1)
    check('生成场景', tree.episodes[0].scenes.length >= 1)
    const firstScene = tree.episodes[0].scenes[0]

    // 场景编辑
    const editedScene = scriptService.updateScene(firstScene.id, { description: '改写后的场景描述' })
    check('编辑场景', editedScene.description === '改写后的场景描述')

    // 3. 资源提取 + 生图
    log.info('[3] 资源素材智能体')
    const assets = await assetService.extract(proj.id)
    check('提取资源(角色/场景/道具)', assets.length >= 3)
    const character = assets.find((a) => a.type === 'character')!
    check('角色含文生图提示词', !!character?.t2iPrompt)

    // 资源确认环节（Stop Rule）
    check('新资源默认未确认', character.confirmed === 0)
    assetService.setConfirmed(character.id, true)
    check('确认单个资源', assetService.get(character.id)!.confirmed === 1)
    assetService.confirmAll(proj.id)
    check('全部确认资源', assetService.list(proj.id).every((a) => a.confirmed === 1))

    const assetGen = genService.imageForAsset(character.id)
    const assetGenStatus = await waitForGen(assetGen.id)
    check('资源生图任务成功', assetGenStatus === 'success', assetGenStatus)
    const detail = assetService.get(character.id)!
    check('资源图入库', detail.images.length >= 1)
    check('资源图已落盘', detail.images.length > 0 && (await fileExists(detail.images[0].filePath)))
    assetService.setReference(detail.images[0].id, true)
    check('标记参考图', assetService.get(character.id)!.images.some((i) => i.isReference === 1))

    // 4. 分镜拆解 + 镜头表 + 分镜图
    log.info('[4] 分镜智能体')
    const shots = await shotService.breakdown(firstScene.id)
    check('场景拆分镜', shots.length >= 1)
    const shot = shots[0]
    check('镜头表字段(景别)', !!shot.shotSize)
    check('拆分镜自动关联场景资源', shotService.assetRefs(shot.id).some((a) => a.type === 'scene'))
    check('建议引用接口可用', Array.isArray(shotService.suggestAssets(shot.id)))
    // 旗舰·两道工序产物 + 电影级字段 + 连续性校验
    check('节拍(Beat)已生成', shotService.beats(firstScene.id).length >= 1)
    check('场景拆解表元素已生成', shotService.sceneElements(firstScene.id).length >= 1)
    check('镜头电影级字段(焦段)', shots.some((s) => !!s.lens))
    check('镜头归属节拍(beatId)', shots.some((s) => !!s.beatId))
    check('连续性校验可用', Array.isArray(shotService.continuityCheck(firstScene.id)))

    shotService.addAssetRef(shot.id, character.id)
    check('分镜引用资源', shotService.assetRefs(shot.id).some((a) => a.id === character.id))

    const sbShot = await shotService.genStoryboardPrompt(shot.id)
    check('生成分镜文生图提示词', !!sbShot.storyboardPrompt)

    const shotImgGen = genService.imageForShot(shot.id)
    const shotImgStatus = await waitForGen(shotImgGen.id)
    check('分镜生图任务成功', shotImgStatus === 'success', shotImgStatus)
    const shotImgs = shotService.images(shot.id)
    check('分镜图入库且默认选定', shotImgs.length >= 1 && shotImgs.some((i) => i.isSelected === 1))
    check('分镜图已落盘', shotImgs.length > 0 && (await fileExists(shotImgs[0].filePath)))

    // 5. 视频提示词 + 图生视频
    log.info('[5] 视频提示词智能体')
    const vpShot = await shotService.genVideoPrompt(shot.id)
    check('生成视频提示词', !!vpShot.videoPrompt)
    check(
      '视频提示词含 Seedance 锚定语',
      !!vpShot.videoPrompt && /保持构图|避免换脸|@图片1/.test(vpShot.videoPrompt)
    )

    const vidGen = genService.videoForShot(shot.id)
    const vidStatus = await waitForGen(vidGen.id)
    check('图生视频任务成功', vidStatus === 'success', vidStatus)
    const vids = shotService.videos(shot.id)
    check('视频碎片入库', vids.length >= 1)
    check('视频碎片已落盘', vids.length > 0 && (await fileExists(vids[0].filePath)))

    // 5.5 资源中心聚合
    log.info('[5.5] 资源中心')
    const media = resourceService.media(proj.id)
    check('资源中心聚合到设定图', media.some((m) => m.kind === 'assetImage'))
    check('资源中心聚合到分镜图', media.some((m) => m.kind === 'shotImage'))
    check('资源中心聚合到视频碎片', media.some((m) => m.kind === 'video'))

    // 5.6 LLM 任务已登记进任务中心
    const gens = genService.list(proj.id)
    check('LLM 操作登记为任务(kind=llm)', gens.some((g) => g.kind === 'llm' && g.status === 'success'))

    // 6. 前置校验：无首帧的分镜不能生视频
    log.info('[6] 前置校验')
    const shot2 = shots[1] ?? (await shotService.breakdown(firstScene.id))[1] ?? shots[0]
    // 用一个没有分镜图的分镜：新建一个干净场景的分镜
    const ep2 = tree.episodes[0]
    const cleanShots = await shotService.breakdown(ep2.scenes[0].id) // 这会重置该场景分镜（清掉刚才的图引用）
    // 重置后 cleanShots[0] 无分镜图、无视频提示词
    let threwNoPrompt = false
    try {
      genService.videoForShot(cleanShots[0].id)
    } catch {
      threwNoPrompt = true
    }
    check('无视频提示词时拒绝生视频', threwNoPrompt)
    // 给它视频提示词但仍无首帧
    await shotService.genVideoPrompt(cleanShots[0].id)
    let threwNoFrame = false
    try {
      genService.videoForShot(cleanShots[0].id)
    } catch {
      threwNoFrame = true
    }
    check('无首帧图时拒绝生视频', threwNoFrame)
    void shot2

    // 7. 设置 + 密钥
    log.info('[7] 设置与密钥')
    const s1 = await updateSettings({ maxConcurrency: 3, llmModel: 'qwen3-vl-plus' })
    check('更新设置', s1.maxConcurrency === 3)
    await setSecret('qwen', 'sk-test-123')
    check('写入密钥后 hasQwenKey', getSettings().hasQwenKey === true)
    await clearSecret('qwen')
    check('清除密钥后 hasQwenKey=false', getSettings().hasQwenKey === false)

    // 8. 级联删除
    log.info('[8] 级联删除')
    const genCountBefore = (getDb()
      .prepare('SELECT COUNT(*) c FROM generations WHERE project_id=?')
      .get(proj.id) as any).c
    check('删除前有生成记录', genCountBefore >= 3)
    await projectService.remove(proj.id)
    const scriptsLeft = (getDb()
      .prepare('SELECT COUNT(*) c FROM scripts WHERE project_id=?')
      .get(proj.id) as any).c
    const shotsLeft = (getDb().prepare('SELECT COUNT(*) c FROM shots').get() as any).c
    const assetsLeft = (getDb()
      .prepare('SELECT COUNT(*) c FROM assets WHERE project_id=?')
      .get(proj.id) as any).c
    const gensLeft = (getDb()
      .prepare('SELECT COUNT(*) c FROM generations WHERE project_id=?')
      .get(proj.id) as any).c
    check('级联删剧本', scriptsLeft === 0)
    check('级联删分镜', shotsLeft === 0)
    check('级联删资源', assetsLeft === 0)
    check('级联删生成记录', gensLeft === 0)
    check('项目已从列表移除', !projectService.list().some((p) => p.id === proj.id))
  } catch (e) {
    failed++
    log.error('SELFTEST 抛出异常:', e)
  }

  log.info('==========================================')
  log.info(`SELFTEST 结果: ${passed} 通过, ${failed} 失败`)
  log.info('==========================================')
  return failed === 0 ? 0 : 1
}

const JUDGE_SYSTEM_PROMPT = `你是好莱坞顶级编剧+导演（奥斯卡评审级别），同时深谙中国头部微短剧的爆款标准。请以最严苛的专业标准为给定短剧剧本打分。
按以下维度评分（给出每项得分与一句犀利评语），并给出总分(满分100)：
1. 结构与节奏 Structure&Pacing（15）：三幕/故事圈是否成立，每集是否自成微型弧光，是否"迟入早出"无废戏。
2. 开场钩子 Hook（15）：前3秒是否直接强冲突、能否阻止划走。
3. 人物与弧光 Character&Arc（15）：主角 想要/需要/创伤/错误信念 是否清晰，是否有转变；反派是否是主题反面。
4. 冲突与反转 Conflict&Twists（15）：反转是否有效、密度是否够、是否靠信息差/打脸驱动。
5. 对白与潜台词 Dialogue&Subtext（10）：是否有潜台词、show-don't-tell，有无白开水台词。
6. 爽点与情绪价值 Payoff&Emotion（10）：爽点是否及时充足，憋屈是否被合理压缩。
7. 每集卡点 Cliffhanger（10）：每集结尾是否"情绪未了、剧情刚翻"。
8. 主题表达 Theme（5）：是否有清晰主控思想且每场为之辩论。
9. 可拍性与画面感 Producibility（5）：场景动作是否具体可拍、竖屏构图意识。
评分要严格、不要客气，达不到职业水准就给低分。
只输出 JSON：{ "dimensions":[{"name":"...","score":n,"max":n,"comment":"..."}], "total":n, "strengths":["..."], "weaknesses":["..."], "suggestions":["针对系统提示词的可操作改进建议"], "verdict":"一句总评" }`

// 剧本评测：真实生成一份剧本 + 用另一个模型做专业评审打分，全量写入 eval-last.json 供人工/迭代分析。
export async function runScriptEval(): Promise<number> {
  const { promises: fs } = await import('node:fs')
  const { join } = await import('node:path')
  const s = getSettings()
  log.info('========== SCRIPTEVAL 开始（真实生成 + 专业评审打分）==========')
  if (!s.hasQwenKey) {
    log.error('未配置 Key，无法评测')
    return 1
  }
  const genre = process.env.EVAL_GENRE || '都市逆袭'
  const episodes = Number(process.env.EVAL_EPISODES || '3')
  let proj
  try {
    proj = projectService.create({ name: '剧本评测临时', genreDefault: genre })
    log.info(`生成中：题材=${genre} 集数=${episodes} 生成模型=${s.scriptModel}`)
    const t0 = Date.now()
    const tree = await scriptService.generate(proj.id, {
      genre,
      episodes,
      durationSecPerEp: 75,
      logline: process.env.EVAL_LOGLINE || ''
    })
    log.info(`生成完成 ${Date.now() - t0}ms：《${tree.script.title}》`)

    // 评审（用另一模型，避免自评）
    log.info(`评审中：评审模型=${s.llmModel}`)
    const scriptForJudge = JSON.stringify(
      {
        title: tree.script.title,
        outline: tree.script.outline ? JSON.parse(tree.script.outline) : null,
        episodes: tree.episodes.map((e) => ({
          idx: e.idx,
          title: e.title,
          synopsis: e.synopsis,
          scenes: e.scenes.map((sc) => ({
            idx: sc.idx,
            slugline: sc.slugline,
            description: sc.description
          }))
        }))
      },
      null,
      2
    )
    const judgeRes = await getLLM().chat({
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', text: scriptForJudge }],
      json: true,
      model: s.llmModel
    })
    const judge = (judgeRes.json ?? {}) as any

    const out = {
      meta: { genre, episodes, scriptModel: s.scriptModel, judgeModel: s.llmModel, at: new Date().toISOString() },
      script: JSON.parse(scriptForJudge),
      judge
    }
    const outPath = join(process.cwd(), 'eval-last.json')
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')

    log.info('---------- 评审结果 ----------')
    if (Array.isArray(judge.dimensions)) {
      for (const d of judge.dimensions) log.info(`  ${d.name}: ${d.score}/${d.max}  ${d.comment ?? ''}`)
    }
    log.info(`  总分 TOTAL: ${judge.total ?? '?'} / 100`)
    log.info(`  评语: ${judge.verdict ?? ''}`)
    log.info(`  全量结果已写入: ${outPath}`)
    return 0
  } catch (e) {
    log.error('SCRIPTEVAL 异常:', (e as Error).message)
    return 1
  } finally {
    if (proj) await projectService.remove(proj.id)
  }
}

// 上传改编评测：读取真实小说/剧本文件 → 改编 → 专业评审打分，写入 eval-parse-last.json。
export async function runParseEval(): Promise<number> {
  const { promises: fs } = await import('node:fs')
  const { join } = await import('node:path')
  const s = getSettings()
  log.info('========== PARSEEVAL 开始（真实改编 + 专业评审打分）==========')
  if (!s.hasQwenKey) {
    log.error('未配置 Key，无法评测')
    return 1
  }
  const filesEnv = process.env.EVAL_FILES || ''
  if (!filesEnv) {
    log.error('请用 EVAL_FILES=路径1,路径2 指定上传文件')
    return 1
  }
  const paths = filesEnv.split(',').map((p) => p.trim()).filter(Boolean)
  let proj
  try {
    const parts: string[] = []
    for (const p of paths) parts.push(await fs.readFile(p, 'utf8'))
    const text = parts.join('\n\n')
    log.info(`读取 ${paths.length} 个文件，共 ${text.length} 字；改编模型=${s.scriptModel}`)

    proj = projectService.create({ name: '改编评测临时', genreDefault: '改编' })
    const t0 = Date.now()
    const tree = await scriptService.parseUpload(proj.id, { text })
    const sceneCount = tree.episodes.reduce((n, e) => n + e.scenes.length, 0)
    log.info(`改编完成 ${Date.now() - t0}ms：《${tree.script.title}》 ${tree.episodes.length} 集 / ${sceneCount} 场`)

    const scriptForJudge = JSON.stringify(
      {
        title: tree.script.title,
        outline: tree.script.outline ? JSON.parse(tree.script.outline) : null,
        episodes: tree.episodes.map((e) => ({
          idx: e.idx,
          title: e.title,
          synopsis: e.synopsis,
          scenes: e.scenes.map((sc) => ({ idx: sc.idx, slugline: sc.slugline, description: sc.description }))
        }))
      },
      null,
      2
    )
    log.info(`评审中：评审模型=${s.llmModel}`)
    const judgeRes = await getLLM().chat({
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', text: scriptForJudge }],
      json: true,
      model: s.llmModel
    })
    const judge = (judgeRes.json ?? {}) as any

    const outPath = join(process.cwd(), 'eval-parse-last.json')
    await fs.writeFile(
      outPath,
      JSON.stringify({ meta: { paths, scriptModel: s.scriptModel, judgeModel: s.llmModel }, script: JSON.parse(scriptForJudge), judge }, null, 2),
      'utf8'
    )

    log.info('---------- 评审结果 ----------')
    if (Array.isArray(judge.dimensions)) for (const d of judge.dimensions) log.info(`  ${d.name}: ${d.score}/${d.max}  ${d.comment ?? ''}`)
    log.info(`  总分 TOTAL: ${judge.total ?? '?'} / 100`)
    log.info(`  评语: ${judge.verdict ?? ''}`)
    log.info(`  全量结果已写入: ${outPath}`)
    return 0
  } catch (e) {
    log.error('PARSEEVAL 异常:', (e as Error).message)
    return 1
  } finally {
    if (proj) await projectService.remove(proj.id)
  }
}

// 资源/角色真实验证：提取后角色 t2iPrompt 应"无裸 hex + 含多视角设定图"
export async function runAssetEval(): Promise<number> {
  const s = getSettings()
  log.info('========== ASSETEVAL 开始（真实提取角色，校验无裸hex+多视角）==========')
  if (!s.hasQwenKey) {
    log.error('未配置 Key')
    return 1
  }
  let proj
  try {
    proj = projectService.create({ name: '资源评测临时', genreDefault: '古装甜宠' })
    await scriptService.generate(proj.id, {
      genre: '古装甜宠',
      episodes: 1,
      durationSecPerEp: 60,
      logline: '逃婚的将军之女与冷面摄政王'
    })
    const assets = await assetService.extract(proj.id)
    const ch = assets.find((a) => a.type === 'character')
    log.info(`角色：${ch?.name}`)
    log.info(`身份摘要 description：${(ch?.description ?? '').slice(0, 140)}`)
    log.info(`t2iPrompt：${(ch?.t2iPrompt ?? '').slice(0, 320)}`)
    const t = ch?.t2iPrompt ?? ''
    const hasHex = /#[0-9a-fA-F]{3,6}\b/.test(t)
    const multiView = /(turnaround|正面|背面|3⁄4|3\/4)/.test(t)
    log.info(hasHex ? '✗ t2iPrompt 仍含裸 hex（不该出现）' : '✓ t2iPrompt 无裸 hex（颜色已自然语言化，不会被画成文字）')
    log.info(multiView ? '✓ 含多视角设定图（multi-view turnaround）' : '✗ 缺多视角')
    return !hasHex && multiView && !!ch ? 0 : 1
  } catch (e) {
    log.error('ASSETEVAL 异常:', (e as Error).message)
    return 1
  } finally {
    if (proj) await projectService.remove(proj.id)
  }
}

// 风格圣经真实验证：参考影片 → 6 区块影像标准
export async function runStyleEval(): Promise<number> {
  const s = getSettings()
  log.info('========== STYLEEVAL 开始（真实生成风格圣经）==========')
  if (!s.hasQwenKey) {
    log.error('未配置 Key')
    return 1
  }
  const ref = process.env.EVAL_STYLE_REF || '《降临》冷蓝灰调 + 罗杰·迪金斯自然光'
  let proj
  try {
    proj = projectService.create({ name: '风格评测临时', genreDefault: '悬疑反转' })
    const t0 = Date.now()
    const p = await projectService.genStyleBible(proj.id, ref)
    let b: any = {}
    try {
      b = JSON.parse(p.styleBible || '{}')
    } catch {
      /* ignore */
    }
    log.info(`耗时 ${Date.now() - t0}ms；参考：${ref}`)
    log.info(`视觉风格：${b.visualStyle ?? ''}`)
    log.info(`调色：${b.colorGrading ?? ''}`)
    log.info(`灯光：${b.lighting ?? ''}`)
    log.info(`镜头语言：${b.cameraLanguage ?? ''}`)
    log.info(`后期质感：${b.postTexture ?? ''}`)
    log.info(`节奏剪辑：${b.rhythmEditing ?? ''}`)
    const ok = !!(b.colorGrading && b.lighting && b.cameraLanguage)
    log.info(ok ? '✓ STYLEEVAL 通过：风格圣经 6 区块有效' : '✗ STYLEEVAL 失败')
    return ok ? 0 : 1
  } catch (e) {
    log.error('STYLEEVAL 异常:', (e as Error).message)
    return 1
  } finally {
    if (proj) await projectService.remove(proj.id)
  }
}

// 真实 LLM 集成验证（会真实调用配置的模型，消耗少量文本 token；不碰生图/生视频）
export async function runLlmTest(): Promise<number> {
  const s = getSettings()
  log.info('========== LLMTEST 开始（真实调用剧本模型）==========')
  log.info(`provider=${s.llmProvider} 剧本模型=${s.scriptModel} hasQwenKey=${s.hasQwenKey}`)
  if (!s.hasQwenKey) {
    log.error('未配置 Qwen/百炼 Key，无法真实验证')
    return 1
  }
  let proj
  // 统计流式增量，证明"生成过程"是分块实时到达的
  let streamCount = 0
  let lastPreview = ''
  setLlmStreamEmitter((evt) => {
    if (!evt.done) {
      streamCount++
      lastPreview = evt.preview
    }
  })
  try {
    proj = projectService.create({ name: 'LLM验证临时项目', genreDefault: '都市逆袭' })
    const t0 = Date.now()
    const tree = await scriptService.generate(proj.id, {
      genre: '都市逆袭',
      episodes: 1,
      durationSecPerEp: 60,
      logline: '外卖小哥意外继承神秘遗产'
    })
    const ms = Date.now() - t0
    log.info(`流式增量推送次数: ${streamCount}（>1 即说明是边生成边显示，而非一次性出现）`)
    log.info(`流式尾部预览片段: ${lastPreview.slice(-80)}`)
    const ok = !!tree.script.title && tree.episodes.length >= 1 && tree.episodes[0].scenes.length >= 1
    log.info(`耗时 ${ms}ms`)
    log.info(`剧名：${tree.script.title}`)
    log.info(`分集数：${tree.episodes.length}，首集场景数：${tree.episodes[0]?.scenes.length ?? 0}`)
    if (tree.script.outline) {
      try {
        const o = JSON.parse(tree.script.outline)
        log.info(`大纲 logline：${o.logline ?? ''}`)
        log.info(`开场钩子：${o.hook ?? ''}`)
      } catch {
        /* ignore */
      }
    }
    log.info(`首场景：${tree.episodes[0]?.scenes[0]?.slugline ?? ''}`)
    log.info(ok ? '✓ LLMTEST 通过：剧本模型真实可用，返回结构有效' : '✗ LLMTEST 失败：返回结构不完整')
    return ok ? 0 : 1
  } catch (e) {
    log.error('✗ LLMTEST 异常（key 无效 / 模型 id 错误 / 网络）:', (e as Error).message)
    return 1
  } finally {
    if (proj) await projectService.remove(proj.id)
  }
}
