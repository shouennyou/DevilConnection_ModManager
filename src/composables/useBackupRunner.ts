import { useDialogs } from '@/composables/useDialogs'
import { useAppStore } from '@/stores/app'
import { useBackupStatusStore } from '@/stores/backupStatus'
import { useProgressStore } from '@/stores/progress'

/** 备份, 恢复和导入流程的统一封装, 通过 ProgressDock 展示状态. */
export function useBackupRunner () {
  const progress = useProgressStore()
  const dialogs = useDialogs()

  /** 生成默认备份名称. */
  function defaultBackupName (): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `存档_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  }

  /** 创建备份并返回是否成功. */
  async function runCreate (name: string): Promise<boolean> {
    const api = window.api?.backup
    if (!api) {
      return false
    }
    const id = `backup-create-${name}`
    progress.start(id, { title: '备份存档', label: name, indeterminate: true })
    const res = await api.create(name)
    if (res.success) {
      progress.finish(id, 'success')
      setTimeout(() => progress.remove(id), 3000)
      return true
    }
    progress.finish(id, 'error', res.message || '备份失败')
    return false
  }

  /** 恢复备份并返回是否成功. */
  async function runRestore (file: string): Promise<boolean> {
    const api = window.api?.backup
    if (!api) {
      return false
    }
    const id = `backup-restore-${file}`
    progress.start(id, { title: '恢复存档', label: file, indeterminate: true })
    const res = await api.restore(file)
    if (res.success) {
      progress.finish(id, 'success')
      setTimeout(() => progress.remove(id), 3000)
      return true
    }
    progress.finish(id, 'error', res.message || '恢复失败')
    return false
  }

  /** 导入备份并返回处理结果. */
  async function runImport (): Promise<{ ok: boolean, canceled?: boolean }> {
    const api = window.api?.backup
    if (!api) {
      return { ok: false }
    }
    // 取消系统文件选择时不创建进度任务.
    const res = await api.import()
    if (!res.success) {
      if (res.canceled) {
        return { ok: false, canceled: true }
      }
      const id = `backup-import-${Date.now()}`
      progress.start(id, { title: '导入备份', label: '导入中', indeterminate: true })
      progress.finish(id, 'error', res.message || '导入失败')
      return { ok: false }
    }
    // 导入已由后端完成, 前端仅显示短暂的完成提示.
    const id = `backup-import-${res.file}`
    progress.start(id, { title: '导入备份', label: res.file || '', indeterminate: true })
    progress.finish(id, 'success')
    setTimeout(() => progress.remove(id), 3000)
    return { ok: true }
  }

  /**
   * 启动时执行自动备份并清理旧备份, 同步更新主页状态.
   * 无存档时视为成功, 无需阻止启动游戏.
   */
  async function runAutoBackup (): Promise<void> {
    const api = window.api?.backup
    const app = useAppStore()
    const backupStatus = useBackupStatusStore()
    if (!api) {
      backupStatus.set('error', '备份服务不可用')
      backupStatus.done = true
      return
    }

    backupStatus.set('running', '正在备份存档...')
    const name = defaultBackupName()
    const id = `backup-auto-${name}`
    progress.start(id, { title: '启动自动备份', label: name, indeterminate: true })

    let res: Awaited<ReturnType<typeof api.create>>
    try {
      res = await api.create(name)
    } catch (error) {
      console.error('[备份任务] 自动备份失败:', error)
      const message = error instanceof Error && error.message ? error.message : '备份服务异常'
      progress.finish(id, 'error', message)
      backupStatus.set('error', message)
      setTimeout(() => progress.remove(id), 3000)
      backupStatus.done = true
      return
    }
    if (res.success) {
      progress.finish(id, 'success')
      backupStatus.set('success', '备份完成')
      // 清理旧备份时保留锁定的备份.
      try {
        await api.cleanup(app.backupRetainDays, app.backupRetainCount)
      } catch (error) {
        console.error('[备份任务] 清理旧备份失败:', error)
        // 清理失败不影响启动游戏.
      }
    } else if (res.noSave) {
      // 尚无存档时无需备份, 可直接启动游戏.
      progress.finish(id, 'success', '无存档需备份')
      backupStatus.set('success', '暂无存档,无需备份')
    } else {
      progress.finish(id, 'error', res.message || '备份失败')
      backupStatus.set('error', res.message || '备份失败')
    }
    setTimeout(() => progress.remove(id), 3000)
    backupStatus.done = true
  }

  return { defaultBackupName, runCreate, runRestore, runImport, runAutoBackup, dialogs }
}
