import type { ModMeta, ModOrderEntry } from '@/types/window-api'
import { useDialogs } from '@/composables/useDialogs'
import { inspectModIssues } from '@/utils/mod-issues'
import { MOD_ORDER_PATH } from '@/utils/mod-order'

const SYSTEM_FILES = new Set(['app.asar', 'app.bak.asar'])

/** 读取当前启用的模组, 用于启动前执行检查. */
async function loadModIssues () {
  const api = window.api?.modmanager
  if (!api) {
    throw new TypeError('模组管理服务不可用')
  }

  const [content, modInfos] = await Promise.all([
    api.readFile(MOD_ORDER_PATH),
    api.scanModInfos(),
  ])
  const orderList: unknown = content ? JSON.parse(content) : []
  if (!Array.isArray(orderList)) {
    throw new TypeError('mod_order.json 格式无效')
  }

  const infoByFile = new Map((modInfos ?? []).map(info => [info.file, info]))
  const mods = orderList
    .filter((entry): entry is ModOrderEntry => {
      return Boolean(entry)
        && typeof entry === 'object'
        && typeof (entry as ModOrderEntry).file === 'string'
        && !SYSTEM_FILES.has((entry as ModOrderEntry).file)
    })
    .map(entry => {
      const info: ModMeta | undefined = infoByFile.get(entry.file)
      return {
        id: info?.id,
        file: entry.file,
        name: info?.name,
        version: info?.version,
        enabled: entry.enabled !== false,
        depends: info?.depends,
        breaks: info?.breaks,
      }
    })

  return inspectModIssues(mods)
}

/** 统一展示模组问题, 并支持启动前或手动校验当前模组组合. */
export function useModIssueCheck () {
  const dialogs = useDialogs()

  async function showIssues (issues: ReturnType<typeof inspectModIssues>['dialogs']): Promise<void> {
    for (const issue of issues) {
      await dialogs.showModIssue(issue)
    }
  }

  async function checkModIssues (showPassedMessage: boolean): Promise<boolean> {
    try {
      const result = await loadModIssues()
      if (result.dialogs.length === 0) {
        if (showPassedMessage) {
          await dialogs.alert({
            title: '模组校验完成',
            message: '当前已启用模组未发现重复 ID, 依赖或冲突问题.',
          })
        }
        return true
      }

      await showIssues(result.dialogs)
      return false
    } catch (error) {
      console.error('[模组问题检测] 当前模组检测失败:', error)
      await dialogs.alert({
        title: showPassedMessage ? '模组校验失败' : '无法启动游戏',
        message: showPassedMessage
          ? '模组问题检测失败, 无法确认当前模组状态.'
          : '模组问题检测失败, 为避免异常启动, 本次启动已取消.',
      })
      return false
    }
  }

  /** 启动前检测到问题时阻止本次游戏启动. */
  async function checkBeforeLaunch (): Promise<boolean> {
    return checkModIssues(false)
  }

  /** 手动重新校验并展示当前模组状态. */
  async function checkCurrentStatus (): Promise<boolean> {
    return checkModIssues(true)
  }

  return { checkBeforeLaunch, checkCurrentStatus, showIssues }
}
