import { ipcMain, BrowserWindow, app, dialog, shell } from 'electron'
import { basename, extname, join } from 'node:path'
import { projectService } from '../services/projectService'
import { scriptService } from '../services/scriptService'
import { assetService } from '../services/assetService'
import { shotService } from '../services/shotService'
import { genService } from '../services/genService'
import { resourceService } from '../services/resourceService'
import { styleCoverService } from '../services/styleCoverService'
import { homePosterService } from '../services/homePosterService'
import { getSettings, updateSettings, setSecret, clearSecret } from '../secrets/store'
import { taskRunner } from '../tasks/taskRunner'
import { log } from '../util/log'
import { exportBundledFile, exportFile } from '../files/fileStore'

type Handler = (...args: any[]) => unknown | Promise<unknown>

function handle(channel: string, fn: Handler): void {
  ipcMain.handle(channel, async (_e, ...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      log.error(`IPC ${channel} 失败:`, (err as Error).message)
      // 把错误信息回传渲染进程（reject）
      throw err
    }
  })
}

export function registerIpc(): void {
  // ---- window controls（自绘标题栏）----
  ipcMain.handle('window:minimize', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize()
  })
  ipcMain.handle('window:toggleMaximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (!w) return false
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
    return w.isMaximized()
  })
  ipcMain.handle('window:close', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close()
  })
  ipcMain.handle('window:isMaximized', (e) => BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false)

  // ---- project ----
  handle('project:create', (d) => projectService.create(d))
  handle('project:list', () => projectService.list())
  handle('project:get', (id) => projectService.get(id))
  handle('project:update', (id, patch) => projectService.update(id, patch))
  handle('project:remove', (id) => projectService.remove(id))
  handle('project:genStyleBible', (id, ref) => projectService.genStyleBible(id, ref))
  handle('project:saveStyleBible', (id, bible, ref) => projectService.saveStyleBible(id, bible, ref))

  // ---- settings ----
  handle('settings:get', () => getSettings())
  handle('settings:update', (patch) => updateSettings(patch))
  handle('settings:setSecret', (key, value) => setSecret(key, value).then(() => ({ ok: true })))
  handle('settings:clearSecret', (key) => clearSecret(key).then(() => ({ ok: true })))

  // ---- sys ----
  handle('sys:openExternal', async (url: string) => {
    // 只放行 http/https 外链，杜绝 file:// 等协议被滥用
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) await shell.openExternal(url)
  })

  // ---- script ----
  handle('script:generate', (pid, params) => scriptService.generate(pid, params))
  handle('script:parseUpload', (pid, input) => scriptService.parseUpload(pid, input))
  handle('script:importFile', (pid, filePath) => scriptService.importFile(pid, filePath))
  handle('script:getTree', (pid) => scriptService.getTree(pid))
  handle('script:updateScene', (sceneId, patch) => scriptService.updateScene(sceneId, patch))
  handle('script:updateEpisode', (epId, patch) => scriptService.updateEpisode(epId, patch))

  // ---- asset ----
  handle('asset:extract', (pid) => assetService.extract(pid))
  handle('asset:list', (pid) => assetService.list(pid))
  handle('asset:listWithCounts', (pid) => assetService.listWithImageCount(pid))
  handle('asset:get', (id) => assetService.get(id))
  handle('asset:create', (input) => assetService.create(input))
  handle('asset:update', (id, patch) => assetService.update(id, patch))
  handle('asset:remove', (id) => assetService.remove(id))
  handle('asset:setReference', (imageId, isRef) => assetService.setReference(imageId, isRef))
  handle('asset:setConfirmed', (id, confirmed) => assetService.setConfirmed(id, confirmed))
  handle('asset:confirmAll', (pid) => assetService.confirmAll(pid))

  // ---- shot ----
  handle('shot:breakdown', (sceneId) => shotService.breakdown(sceneId))
  handle('shot:breakdownSheet', (sceneId) => shotService.breakdownSheet(sceneId))
  handle('shot:shotList', (sceneId) => shotService.shotList(sceneId))
  handle('shot:beats', (sceneId) => shotService.beats(sceneId))
  handle('shot:sceneElements', (sceneId) => shotService.sceneElements(sceneId))
  handle('shot:continuityCheck', (sceneId) => shotService.continuityCheck(sceneId))
  handle('shot:listByScene', (sceneId) => shotService.listByScene(sceneId))
  handle('shot:update', (id, patch) => shotService.update(id, patch))
  handle('shot:remove', (id) => shotService.remove(id))
  handle('shot:images', (id) => shotService.images(id))
  handle('shot:videos', (id) => shotService.videos(id))
  handle('shot:selectImage', (shotId, imageId) => shotService.selectImage(shotId, imageId))
  handle('shot:selectVideo', (shotId, videoId) => shotService.selectVideo(shotId, videoId))
  handle('shot:assetRefs', (id) => shotService.assetRefs(id))
  handle('shot:assetRefsDetailed', (id) => shotService.assetRefsDetailed(id))
  handle('shot:suggestAssets', (id) => shotService.suggestAssets(id))
  handle('shot:addAssetRef', (shotId, assetId) => shotService.addAssetRef(shotId, assetId))
  handle('shot:removeAssetRef', (shotId, assetId) => shotService.removeAssetRef(shotId, assetId))
  handle('shot:genStoryboardPrompt', (id) => shotService.genStoryboardPrompt(id))
  handle('shot:genVideoPrompt', (id) => shotService.genVideoPrompt(id))

  // ---- gen ----
  handle('gen:imageForAsset', (assetId) => genService.imageForAsset(assetId))
  handle('gen:imageForShot', (shotId) => genService.imageForShot(shotId))
  handle('gen:videoForShot', (shotId) => genService.videoForShot(shotId))
  handle('gen:list', (pid) => genService.list(pid))
  handle('gen:retry', (id) => genService.retry(id))
  handle('gen:cancel', (id) => genService.cancel(id))

  // ---- resource center ----
  handle('resource:media', (pid) => resourceService.media(pid))

  // ---- style covers ----
  handle('style:covers', () => styleCoverService.covers())
  handle('style:genCover', (id) => styleCoverService.genCover(id))

  // ---- home posters（首页案例海报，临时生成入口）----
  handle('home:genPoster', (id) => homePosterService.genPoster(id))

  // ---- files ----
  // 经自定义 media:// 协议服务（main/index.ts 注册），dev/prod origin 均可加载
  handle('file:url', (rel: string) => `media://local/${rel.split('/').map(encodeURIComponent).join('/')}`)
  handle('file:save', async (rel: string, suggestedName?: string, scope: 'data' | 'app' = 'data') => {
    const sourceExt = extname(rel)
    const rawName = (suggestedName || basename(rel) || `生成图片${sourceExt}`).trim()
    const safeName = rawName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    const fileName = extname(safeName) || !sourceExt ? safeName : `${safeName}${sourceExt}`
    const result = await dialog.showSaveDialog({
      title: '下载到本地',
      defaultPath: join(app.getPath('downloads'), fileName),
      buttonLabel: '保存'
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    if (scope === 'app') {
      const bundledRoot = app.isPackaged
        ? join(app.getAppPath(), 'out', 'renderer')
        : join(app.getAppPath(), 'public')
      await exportBundledFile(bundledRoot, rel.replace(/^[/\\]+/, ''), result.filePath)
    } else {
      await exportFile(rel, result.filePath)
    }
    return { canceled: false, filePath: result.filePath }
  })

  // 并发数同步
  taskRunner.setConcurrency(getSettings().maxConcurrency)
}
