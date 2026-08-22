import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ProgressStatus = 'running' | 'success' | 'error'

export interface ProgressTask {
  /** 唯一标识, 通常使用与进度回调一致的文件名. */
  id: string
  /** 卡片显示的名称. */
  label: string
  /** 卡片标题, 例如下载更新或恢复存档. */
  title: string
  percent: number
  status: ProgressStatus
  /** 备份, 恢复或导入等无精确百分比的操作显示不确定进度条. */
  indeterminate?: boolean
  message?: string
  /** 取消任务时执行的后端清理逻辑. */
  onCancel?: () => void
}

/**
 * 全局后台任务进度管理, 供 ProgressDock 展示多个并发任务.
 * 进度可由任务发起方或全局下载监听器更新.
 */
export const useProgressStore = defineStore('progress', () => {
  const tasks = ref<ProgressTask[]>([])
  const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** 开始或重置任务. */
  function start (id: string, options: { label?: string, title?: string, indeterminate?: boolean, onCancel?: () => void } = {}) {
    const existing = tasks.value.find(t => t.id === id)
    if (existing) {
      existing.percent = 0
      existing.status = 'running'
      existing.message = undefined
      existing.indeterminate = options.indeterminate ?? false
      existing.onCancel = options.onCancel
      if (options.label) {
        existing.label = options.label
      }
      if (options.title) {
        existing.title = options.title
      }
      return
    }
    tasks.value.push({
      id,
      label: options.label ?? id,
      title: options.title ?? '处理中',
      percent: 0,
      status: 'running',
      indeterminate: options.indeterminate ?? false,
      onCancel: options.onCancel,
    })
  }

  /** 更新进行中任务的进度百分比. */
  function update (id: string, percent: number) {
    const task = tasks.value.find(t => t.id === id)
    if (!task || task.status !== 'running' || task.indeterminate || !Number.isFinite(percent)) {
      return
    }

    // 网络进度事件可能重复或乱序, 仅接受递增进度以避免进度条回跳抖动.
    const nextPercent = Math.min(99, Math.max(0, Math.round(percent)))
    if (nextPercent <= task.percent) {
      return
    }
    task.percent = nextPercent
  }

  /** 标记任务成功或失败. */
  function finish (id: string, status: 'success' | 'error', message?: string) {
    const task = tasks.value.find(t => t.id === id)
    if (!task) {
      return
    }
    task.status = status
    task.message = message
    if (status === 'success') {
      task.percent = 100
    }
  }

  /** 延迟移除任务, 返回可取消的定时器句柄. */
  function scheduleRemove (id: string, delay = 3000): ReturnType<typeof setTimeout> | undefined {
    const previous = removalTimers.get(id)
    if (previous) {
      clearTimeout(previous)
    }
    const timer = setTimeout(() => {
      removalTimers.delete(id)
      remove(id)
    }, delay)
    removalTimers.set(id, timer)
    return timer
  }

  /** 取消任务及其延迟清理定时器. */
  function cancel (id: string): void {
    const task = tasks.value.find(t => t.id === id)
    try {
      task?.onCancel?.()
    } catch (error) {
      console.error('[进度任务] 取消任务失败:', error)
    }
    const timer = removalTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      removalTimers.delete(id)
    }
    remove(id)
  }

  /** 移除任务. */
  function remove (id: string) {
    const timer = removalTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      removalTimers.delete(id)
    }
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      tasks.value.splice(idx, 1)
    }
  }

  return { tasks, start, update, finish, scheduleRemove, cancel, remove }
})
