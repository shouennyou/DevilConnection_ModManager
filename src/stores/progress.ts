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
}

/**
 * 全局后台任务进度管理, 供 ProgressDock 展示多个并发任务.
 * 进度可由任务发起方或全局下载监听器更新.
 */
export const useProgressStore = defineStore('progress', () => {
  const tasks = ref<ProgressTask[]>([])

  /** 开始或重置任务. */
  function start (id: string, options: { label?: string, title?: string, indeterminate?: boolean } = {}) {
    const existing = tasks.value.find(t => t.id === id)
    if (existing) {
      existing.percent = 0
      existing.status = 'running'
      existing.message = undefined
      existing.indeterminate = options.indeterminate ?? false
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

  /** 移除任务. */
  function remove (id: string) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      tasks.value.splice(idx, 1)
    }
  }

  return { tasks, start, update, finish, remove }
})
