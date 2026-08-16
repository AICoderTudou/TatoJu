import { app, BrowserWindow, protocol, net } from 'electron'
import { join, normalize } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { initDb, closeDb } from './db/client'
import { initFileStore, dataDir, absPath } from './files/fileStore'
import { initSecretsStore, setSecret, updateSettings, getSettings, getSecretPlain } from './secrets/store'
import { registerIpc } from './ipc'
import { setProgressEmitter } from './tasks/taskRunner'
import { setLlmStreamEmitter } from './tasks/track'
import { log } from './util/log'
import type { GenProgressEvent, GenStreamEvent } from '@shared/types'

const SELFTEST = process.env.SELFTEST === '1'
const SMOKE = process.env.SMOKE === '1'
const CONFIGURE = process.env.CONFIGURE === '1'
const LLMTEST = process.env.LLMTEST === '1'

// 自定义安全协议必须在 app ready 前声明
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

let mainWindow: BrowserWindow | null = null

function resolveDataDir(): string {
  if (SELFTEST) {
    // 自测用隔离临时目录，避免污染真实数据
    return join(app.getPath('temp'), 'duanju-selftest-' + Date.now())
  }
  return join(app.getPath('userData'), 'data')
}

async function bootstrap(): Promise<void> {
  const dir = resolveDataDir()
  initFileStore(dir)
  await initSecretsStore(dir)
  // 确保数据目录存在再开库
  const { promises: fs } = await import('node:fs')
  await fs.mkdir(dir, { recursive: true })
  initDb(join(dir, 'app.db'))
  registerIpc()
  log.info('数据目录:', dir)
}

function registerMediaProtocol(): void {
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url)
      // media://local/<relpath>
      const rel = decodeURIComponent(url.pathname.replace(/^\//, ''))
      const target = normalize(absPath(rel))
      // 防目录穿越：必须落在 dataDir 内
      if (!target.startsWith(normalize(dataDir()))) {
        return new Response('forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(target).toString())
    } catch (e) {
      return new Response('not found', { status: 404 })
    }
  })
}

function createWindow(): void {
  // 开发期显式给窗口/任务栏图标；打包后由 exe 内嵌图标(build/icon)提供
  const devIcon = join(app.getAppPath(), 'build', 'icon.png')
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#060708',
    autoHideMenuBar: true,
    frame: false, // 无原生标题栏，使用自绘标题栏 + 窗口控件
    ...(existsSync(devIcon) ? { icon: devIcon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setProgressEmitter((evt: GenProgressEvent) => {
    mainWindow?.webContents.send('gen:progress', evt)
  })
  setLlmStreamEmitter((evt: GenStreamEvent) => {
    mainWindow?.webContents.send('gen:stream', evt)
  })

  // 最大化状态变化时通知渲染进程，用于切换"最大化/还原"图标
  const sendMaxState = (): void =>
    mainWindow?.webContents.send('window:maximized', mainWindow?.isMaximized() ?? false)
  mainWindow.on('maximize', sendMaxState)
  mainWindow.on('unmaximize', sendMaxState)

  const wc = mainWindow.webContents
  wc.on('console-message', (_e, level, message) => {
    if (level >= 2) log.warn('[renderer]', message)
  })
  wc.on('preload-error', (_e, path, err) => log.error('[preload-error]', path, err))
  wc.on('render-process-gone', (_e, d) => log.error('[render-gone]', d.reason))

  if (SMOKE) {
    wc.once('did-finish-load', async () => {
      try {
        const hasApi = await wc.executeJavaScript('typeof window.api')
        const hasGen = await wc.executeJavaScript('typeof window.api?.gen?.imageForShot')
        const hasAuth = await wc.executeJavaScript('typeof window.api?.auth')
        // 首页路由组件是懒加载的，did-finish-load 时可能还没渲染完——轮询等内容落定再断言
        let mounted = 0
        for (let i = 0; i < 30; i++) {
          mounted = Number(
            await wc.executeJavaScript('document.getElementById("app")?.innerHTML?.length || 0')
          )
          if (mounted > 500) break
          await new Promise((r) => setTimeout(r, 100))
        }
        const hasApiNotice = Boolean(
          await wc.executeJavaScript(
            'document.body?.innerText?.includes("2-5折算力 API Key") && document.body?.innerText?.includes("api.aitudou.net")'
          )
        )
        log.info(
          `[SMOKE] window.api=${hasApi} gen.imageForShot=${hasGen} auth=${hasAuth} apiNotice=${hasApiNotice} mountedHtmlLen=${mounted}`
        )
        const ok =
          hasApi === 'object' &&
          hasGen === 'function' &&
          hasAuth === 'undefined' &&
          hasApiNotice &&
          Number(mounted) > 0
        log.info(`[SMOKE] ${ok ? 'PASS ✓ 渲染进程已挂载且 window.api 注入成功' : 'FAIL ✗'}`)
        app.exit(ok ? 0 : 1)
      } catch (e) {
        log.error('[SMOKE] 异常', e)
        app.exit(1)
      }
    })
    setTimeout(() => {
      log.error('[SMOKE] 超时未完成加载')
      app.exit(1)
    }, 20000)
  }

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await bootstrap()

  if (CONFIGURE) {
    if (process.env.CFG_QWEN_KEY) await setSecret('qwen', process.env.CFG_QWEN_KEY)
    if (process.env.CFG_RUNNINGHUB_KEY) await setSecret('runninghub', process.env.CFG_RUNNINGHUB_KEY)
    const patch: Record<string, string> = {}
    if (process.env.CFG_LLM_MODEL) patch.llmModel = process.env.CFG_LLM_MODEL
    if (process.env.CFG_SCRIPT_MODEL) patch.scriptModel = process.env.CFG_SCRIPT_MODEL
    if (Object.keys(patch).length) await updateSettings(patch)
    const s = getSettings()
    log.info('[CONFIGURE] 完成', {
      hasQwenKey: s.hasQwenKey,
      llmModel: s.llmModel,
      scriptModel: s.scriptModel
    })
    closeDb()
    app.exit(0)
    return
  }

  if (process.env.GENCOVERS) {
    const { styleCoverService } = await import('./services/styleCoverService')
    const { STYLE_TEMPLATES } = await import('@shared/styleTemplates')

    // 启动即校验 Key（只打印是否存在，绝不打印密钥值），缺失立刻退出，避免空跑
    if (!getSecretPlain('runninghub')) {
      log.error('[GENCOVERS] 未配置 RunningHub Key（先用 CONFIGURE 或设置页填入），退出')
      closeDb()
      app.exit(1)
      return
    }

    const sel = process.env.GENCOVERS
    let list = STYLE_TEMPLATES
    if (sel === 'real' || sel === '2d' || sel === '3d') list = list.filter((t) => t.category === sel)
    else if (/^\d+$/.test(sel)) list = list.slice(0, Number(sel))

    // 默认跳过已生成的封面（断点续跑、不重复烧额度）；GENCOVERS_FORCE=1 强制重生
    const stylesDir = join(app.getAppPath(), 'public', 'styles')
    if (process.env.GENCOVERS_FORCE !== '1') {
      const before = list.length
      list = list.filter((t) => !existsSync(join(stylesDir, `${t.id}.webp`)))
      log.info(`[GENCOVERS] 跳过已存在 ${before - list.length} 张，待生成 ${list.length} 张`)
    }

    const conc = Math.max(1, Number(process.env.GENCOVERS_CONC || '3'))
    const total = list.length
    log.info(`[GENCOVERS] 开始生成 ${total} 张封面，并发 ${conc}`)
    let ok = 0
    let fail = 0
    let cursor = 0
    const worker = async (): Promise<void> => {
      for (;;) {
        const i = cursor++
        if (i >= total) return
        const t = list[i]
        try {
          const r = await styleCoverService.genCover(t.id)
          ok++
          log.info(`[COVER ${ok + fail}/${total}] ✓ ${t.name} ${r.relPath}`)
        } catch (e) {
          fail++
          log.error(`[COVER ${ok + fail}/${total}] ✗ ${t.name} ${(e as Error).message}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(conc, total || 1) }, () => worker()))
    log.info(`[GENCOVERS] 完成：成功 ${ok}，失败 ${fail}`)
    closeDb()
    app.exit(ok === 0 && fail > 0 ? 1 : 0)
    return
  }

  if (process.env.GENPOSTERS) {
    const { homePosterService } = await import('./services/homePosterService')
    const { HOME_CASES } = await import('@shared/homeCases')

    if (!getSecretPlain('runninghub')) {
      log.error('[GENPOSTERS] 未配置 RunningHub Key（先用 CONFIGURE 或设置页填入），退出')
      closeDb()
      app.exit(1)
      return
    }

    let list = HOME_CASES
    // 默认跳过已生成（断点续跑）；GENPOSTERS_FORCE=1 强制重生
    const casesDir = join(app.getAppPath(), 'public', 'cases')
    if (process.env.GENPOSTERS_FORCE !== '1') {
      const before = list.length
      list = list.filter((c) => !existsSync(join(casesDir, `${c.id}.webp`)))
      log.info(`[GENPOSTERS] 跳过已存在 ${before - list.length} 张，待生成 ${list.length} 张`)
    }

    const conc = Math.max(1, Number(process.env.GENPOSTERS_CONC || '2'))
    const total = list.length
    log.info(`[GENPOSTERS] 开始生成 ${total} 张海报，并发 ${conc}`)
    let ok = 0
    let fail = 0
    let cursor = 0
    const worker = async (): Promise<void> => {
      for (;;) {
        const i = cursor++
        if (i >= total) return
        const c = list[i]
        try {
          const r = await homePosterService.genPoster(c.id)
          ok++
          log.info(`[POSTER ${ok + fail}/${total}] ✓ ${c.title} ${r.relPath}`)
        } catch (e) {
          fail++
          log.error(`[POSTER ${ok + fail}/${total}] ✗ ${c.title} ${(e as Error).message}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(conc, total || 1) }, () => worker()))
    log.info(`[GENPOSTERS] 完成：成功 ${ok}，失败 ${fail}`)
    closeDb()
    app.exit(ok === 0 && fail > 0 ? 1 : 0)
    return
  }

  if (LLMTEST) {
    const { runLlmTest } = await import('./selftest')
    const code = await runLlmTest()
    closeDb()
    app.exit(code)
    return
  }

  if (process.env.SCRIPTEVAL === '1') {
    const { runScriptEval } = await import('./selftest')
    const code = await runScriptEval()
    closeDb()
    app.exit(code)
    return
  }

  if (process.env.PARSEEVAL === '1') {
    const { runParseEval } = await import('./selftest')
    const code = await runParseEval()
    closeDb()
    app.exit(code)
    return
  }

  if (process.env.STYLEEVAL === '1') {
    const { runStyleEval } = await import('./selftest')
    const code = await runStyleEval()
    closeDb()
    app.exit(code)
    return
  }

  if (process.env.ASSETEVAL === '1') {
    const { runAssetEval } = await import('./selftest')
    const code = await runAssetEval()
    closeDb()
    app.exit(code)
    return
  }

  if (process.env.ASSETEVAL === '1') {
    const { runAssetEval } = await import('./selftest')
    const code = await runAssetEval()
    closeDb()
    app.exit(code)
    return
  }

  if (SELFTEST) {
    const { runSelfTest } = await import('./selftest')
    const code = await runSelfTest()
    closeDb()
    app.exit(code)
    return
  }

  registerMediaProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDb()
    app.quit()
  }
})
