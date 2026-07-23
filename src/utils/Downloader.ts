import axios, { type AxiosProgressEvent } from 'axios'

export interface DownloadTask {
  id: string
  url: string
  filename: string
  total: number
  loaded: number
  speed: number
  progress: number
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error'
  error?: string
}

type ProgressCallback = (task: DownloadTask) => void

function generateId (): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function formatSpeed (bytesPerSec: number): string {
  if (bytesPerSec < 1024) {
    return `${bytesPerSec.toFixed(0)} B/s`
  }
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  }
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
}

class Downloader {
  private tasks = new Map<string, DownloadTask>()
  private cancelTokens = new Map<string, () => void>()
  private callbacks = new Set<ProgressCallback>()

  async download (
    url: string,
    filename: string,
    savePath?: string,
  ): Promise<Blob | string> {
    const id = generateId()
    const startTime = Date.now()
    let lastLoaded = 0
    let lastTime = startTime

    const task: DownloadTask = {
      id,
      url,
      filename,
      total: 0,
      loaded: 0,
      speed: 0,
      progress: 0,
      status: 'pending',
    }
    this.tasks.set(id, task)
    this.notify(task)

    const controller = new AbortController()
    this.cancelTokens.set(id, () => controller.abort())

    task.status = 'downloading'
    this.notify(task)

    try {
      const response = await axios.get(url, {
        responseType: 'blob',
        signal: controller.signal,
        onDownloadProgress: (event: AxiosProgressEvent) => {
          const now = Date.now()
          const elapsed = (now - lastTime) / 1000
          const delta = (event.loaded ?? 0) - lastLoaded

          if (elapsed >= 0.3) {
            task.speed = delta / elapsed
            lastLoaded = event.loaded ?? 0
            lastTime = now
          }

          task.total = event.total ?? 0
          task.loaded = event.loaded ?? 0
          task.progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0
          this.notify(task)
        },
      })

      task.status = 'completed'
      task.progress = 100
      task.loaded = task.total
      task.speed = 0
      this.notify(task)

      this.cancelTokens.delete(id)

      if (savePath) {
        const url2 = URL.createObjectURL(response.data)
        const a = document.createElement('a')
        a.href = url2
        a.download = savePath
        a.click()
        URL.revokeObjectURL(url2)
        return savePath
      }

      return response.data
    } catch (error: unknown) {
      console.error('[下载器] 下载任务失败:', error)
      task.status = 'error'
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        task.error = '文件不存在'
      } else if (axios.isCancel(error)) {
        task.error = '用户取消'
        task.status = 'paused'
      } else {
        task.error = '下载失败'
      }
      this.notify(task)
      throw error
    }
  }

  pause (id: string): void {
    const cancel = this.cancelTokens.get(id)
    if (cancel) {
      cancel()
      this.cancelTokens.delete(id)
      const task = this.tasks.get(id)
      if (task) {
        task.status = 'paused'
        this.notify(task)
      }
    }
  }

  cancel (id: string): void {
    const cancel = this.cancelTokens.get(id)
    if (cancel) {
      cancel()
      this.cancelTokens.delete(id)
    }
    this.tasks.delete(id)
  }

  resume (url: string, filename: string, savePath?: string): Promise<Blob | string> {
    return this.download(url, filename, savePath)
  }

  getTask (id: string): DownloadTask | undefined {
    return this.tasks.get(id)
  }

  getAllTasks (): DownloadTask[] {
    return Array.from(this.tasks.values())
  }

  formatSpeed (bytesPerSec: number): string {
    return formatSpeed(bytesPerSec)
  }

  onProgress (callback: ProgressCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  private notify (task: DownloadTask): void {
    for (const cb of this.callbacks) {
      cb(task)
    }
  }
}

export const downloader = new Downloader()
export { formatSpeed }
export default Downloader
