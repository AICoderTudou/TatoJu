// 与主进程 media:// 协议处理保持一致，渲染端同步构造 URL，避免每张图都走一次 IPC。
export function mediaUrl(rel: string): string {
  return 'media://local/' + rel.split('/').map(encodeURIComponent).join('/')
}
