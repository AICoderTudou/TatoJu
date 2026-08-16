import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '@shared/ipc'
import type { GenProgressEvent, GenStreamEvent } from '@shared/types'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>

const api: Api = {
  project: {
    create: (input) => invoke('project:create', input),
    list: () => invoke('project:list'),
    get: (id) => invoke('project:get', id),
    update: (id, patch) => invoke('project:update', id, patch),
    remove: (id) => invoke('project:remove', id),
    genStyleBible: (id, ref) => invoke('project:genStyleBible', id, ref),
    saveStyleBible: (id, bible, ref) => invoke('project:saveStyleBible', id, bible, ref)
  },
  settings: {
    get: () => invoke('settings:get'),
    update: (patch) => invoke('settings:update', patch),
    setSecret: (key, value) => invoke('settings:setSecret', key, value),
    clearSecret: (key) => invoke('settings:clearSecret', key)
  },
  sys: {
    openExternal: (url) => invoke('sys:openExternal', url)
  },
  script: {
    generate: (projectId, params) => invoke('script:generate', projectId, params),
    parseUpload: (projectId, input) => invoke('script:parseUpload', projectId, input),
    importFile: (projectId, filePath) => invoke('script:importFile', projectId, filePath),
    getTree: (projectId) => invoke('script:getTree', projectId),
    updateScene: (sceneId, patch) => invoke('script:updateScene', sceneId, patch),
    updateEpisode: (episodeId, patch) => invoke('script:updateEpisode', episodeId, patch)
  },
  asset: {
    extract: (projectId) => invoke('asset:extract', projectId),
    list: (projectId) => invoke('asset:list', projectId),
    listWithCounts: (projectId) => invoke('asset:listWithCounts', projectId),
    get: (id) => invoke('asset:get', id),
    create: (input) => invoke('asset:create', input),
    update: (id, patch) => invoke('asset:update', id, patch),
    remove: (id) => invoke('asset:remove', id),
    setReference: (imageId, isReference) => invoke('asset:setReference', imageId, isReference),
    setConfirmed: (id, confirmed) => invoke('asset:setConfirmed', id, confirmed),
    confirmAll: (projectId) => invoke('asset:confirmAll', projectId)
  },
  shot: {
    breakdown: (sceneId) => invoke('shot:breakdown', sceneId),
    breakdownSheet: (sceneId) => invoke('shot:breakdownSheet', sceneId),
    shotList: (sceneId) => invoke('shot:shotList', sceneId),
    beats: (sceneId) => invoke('shot:beats', sceneId),
    sceneElements: (sceneId) => invoke('shot:sceneElements', sceneId),
    continuityCheck: (sceneId) => invoke('shot:continuityCheck', sceneId),
    listByScene: (sceneId) => invoke('shot:listByScene', sceneId),
    update: (id, patch) => invoke('shot:update', id, patch),
    remove: (id) => invoke('shot:remove', id),
    images: (shotId) => invoke('shot:images', shotId),
    videos: (shotId) => invoke('shot:videos', shotId),
    selectImage: (shotId, imageId) => invoke('shot:selectImage', shotId, imageId),
    selectVideo: (shotId, videoId) => invoke('shot:selectVideo', shotId, videoId),
    assetRefs: (shotId) => invoke('shot:assetRefs', shotId),
    assetRefsDetailed: (shotId) => invoke('shot:assetRefsDetailed', shotId),
    suggestAssets: (shotId) => invoke('shot:suggestAssets', shotId),
    addAssetRef: (shotId, assetId) => invoke('shot:addAssetRef', shotId, assetId),
    removeAssetRef: (shotId, assetId) => invoke('shot:removeAssetRef', shotId, assetId),
    genStoryboardPrompt: (shotId) => invoke('shot:genStoryboardPrompt', shotId),
    genVideoPrompt: (shotId) => invoke('shot:genVideoPrompt', shotId)
  },
  gen: {
    imageForAsset: (assetId) => invoke('gen:imageForAsset', assetId),
    imageForShot: (shotId) => invoke('gen:imageForShot', shotId),
    videoForShot: (shotId) => invoke('gen:videoForShot', shotId),
    list: (projectId) => invoke('gen:list', projectId),
    retry: (generationId) => invoke('gen:retry', generationId),
    cancel: (generationId) => invoke('gen:cancel', generationId),
    onProgress: (cb: (evt: GenProgressEvent) => void) => {
      const listener = (_e: unknown, evt: GenProgressEvent): void => cb(evt)
      ipcRenderer.on('gen:progress', listener)
      return () => ipcRenderer.removeListener('gen:progress', listener)
    },
    onStream: (cb: (evt: GenStreamEvent) => void) => {
      const listener = (_e: unknown, evt: GenStreamEvent): void => cb(evt)
      ipcRenderer.on('gen:stream', listener)
      return () => ipcRenderer.removeListener('gen:stream', listener)
    }
  },
  resource: {
    media: (projectId) => invoke('resource:media', projectId)
  },
  style: {
    covers: () => invoke('style:covers'),
    genCover: (id) => invoke('style:genCover', id)
  },
  home: {
    genPoster: (id) => invoke('home:genPoster', id)
  },
  win: {
    minimize: () => invoke('window:minimize'),
    toggleMaximize: () => invoke('window:toggleMaximize'),
    close: () => invoke('window:close'),
    isMaximized: () => invoke('window:isMaximized'),
    onMaximizeChange: (cb: (maximized: boolean) => void) => {
      const listener = (_e: unknown, m: boolean): void => cb(m)
      ipcRenderer.on('window:maximized', listener)
      return () => ipcRenderer.removeListener('window:maximized', listener)
    }
  },
  fileUrl: (relPath) => invoke('file:url', relPath),
  saveFile: (relPath, suggestedName, scope) => invoke('file:save', relPath, suggestedName, scope)
}

contextBridge.exposeInMainWorld('api', api)
