import { useProgressStore } from '@/stores/progress'

export interface ModDownloadRequest {
  modId: string
  fileName: string
  displayName: string
  asarUrl: string
  title: string
}

export interface ModDownloadResult {
  success: boolean
  message?: string
}

let progressListenerBound = false
/** 同一模组的进行中下载, 防止不同入口重复发起覆盖操作. */
const activeDownloads = new Map<string, Promise<ModDownloadResult>>()

/** 下载 asar 的公共流程, 供模组管理和模组工坊共用. */
export function useModDownload () {
  const progress = useProgressStore()

  function bindProgressListener (): void {
    const api = window.api?.modmanager
    if (!api || progressListenerBound) {
      return
    }

    api.onDownloadProgress(({ fileName, received, total, result }) => {
      if (!result && received >= 0 && total > 0) {
        progress.update(fileName, Math.round((received / total) * 100))
      }
    })
    progressListenerBound = true
  }

  async function performDownload (request: ModDownloadRequest): Promise<ModDownloadResult> {
    const api = window.api?.modmanager
    if (!api) {
      return { success: false, message: '仅在应用内可用' }
    }
    if (!request.asarUrl) {
      return { success: false, message: '未提供下载地址' }
    }

    bindProgressListener()
    progress.start(request.fileName, { title: request.title, label: request.displayName })
    try {
      const result = await api.downloadAndReplace(request.asarUrl, request.fileName)
      progress.finish(request.fileName, result.success ? 'success' : 'error', result.message)
      return result
    } catch (error) {
      console.error('[模组下载] 下载模组失败:', error)
      const message = error instanceof Error ? error.message : '下载失败'
      progress.finish(request.fileName, 'error', message)
      return { success: false, message }
    }
  }

  function downloadModAsar (request: ModDownloadRequest): Promise<ModDownloadResult> {
    const modKey = request.modId.trim() || request.fileName
    const activeDownload = activeDownloads.get(modKey)
    if (activeDownload) {
      return activeDownload
    }

    const download = performDownload(request)
    activeDownloads.set(modKey, download)
    void download.then(
      () => releaseDownload(modKey, download),
      () => releaseDownload(modKey, download),
    )
    return download
  }

  function releaseDownload (modKey: string, download: Promise<ModDownloadResult>): void {
    if (activeDownloads.get(modKey) === download) {
      activeDownloads.delete(modKey)
    }
  }

  /** 下载并替换已安装模组. */
  function updateMod (request: Omit<ModDownloadRequest, 'title'>): Promise<ModDownloadResult> {
    return downloadModAsar({ ...request, title: '下载更新' })
  }

  return { downloadModAsar, updateMod }
}
