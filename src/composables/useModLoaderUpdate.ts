import type { ModLoaderAPI } from '@/types/window-api'
import type { Release } from '@/utils/Updater'
import { ref } from 'vue'
import { useDialogs } from '@/composables/useDialogs'
import { MODLOADER_REPO } from '@/config/repos'
import { useAppStore } from '@/stores/app'
import { updater } from '@/utils/Updater'

interface ReleaseSummary {
  tag: string
  body: string
  htmlUrl: string
  prerelease: boolean
}

/** ModLoader 版本文件相对 resourcesPath 的路径. */
const MODLOADER_VERSION_PATH = 'app.asar/node_modules/dc-modloader/version.json'

/** 异步读取并解析本地 ModLoader 版本号, 失败时返回 null. */
async function readLocalModLoaderVersion (ml: ModLoaderAPI): Promise<string | null> {
  try {
    const text = await ml.readFile(MODLOADER_VERSION_PATH)
    if (!text) {
      return null
    }
    const json = JSON.parse(text) as { version?: string }
    return json.version || null
  } catch (error) {
    console.error('[ModLoader 更新] 读取本地版本失败:', error)
    return null
  }
}

/** 模块级更新状态, 在组件和页面之间共享. */
const checking = ref(false)
const checked = ref(false)
const localVersion = ref('')
const hasUpdate = ref(false)
const latest = ref<ReleaseSummary | null>(null)
const statusText = ref('点击检查更新')

export function useModLoaderUpdate () {
  const appStore = useAppStore()
  const dialogs = useDialogs()

  /** 按当前正式版或预览版设置计算更新状态, 不发起网络请求. */
  function applyReleases (releases: Release[], version: string, preRelease: boolean): void {
    const info = updater.computeUpdate(releases, version, { includePreview: preRelease })
    const top = preRelease
      ? info.latest ?? info.latestStable
      : info.latestStable ?? info.latest

    if (!top) {
      hasUpdate.value = false
      latest.value = null
      statusText.value = '暂无可用版本'
      return
    }

    hasUpdate.value = info.hasUpdate
    latest.value = { tag: top.tag, body: top.body, htmlUrl: top.htmlUrl, prerelease: top.isPrerelease }
    statusText.value = info.hasUpdate
      ? `发现新版本 ${top.tag}${top.isPrerelease ? ' (预览版)' : ''}`
      : '已是最新版本'
  }

  /** 检查 ModLoader 更新, 每次均从 GitHub 获取最新发布版本. */
  async function check (): Promise<void> {
    if (checking.value) {
      return
    }

    const ml = window.api?.modloader
    if (!ml) {
      statusText.value = '仅在应用内可用'
      return
    }

    checking.value = true
    try {
      const version = await readLocalModLoaderVersion(ml)
      if (!version) {
        statusText.value = '无法读取本地版本'
        return
      }
      localVersion.value = version

      // 匿名 Octokit 请求会自动处理网络波动和限流.
      const releases = await updater.getReleases(MODLOADER_REPO)

      applyReleases(releases, version, appStore.checkPreRelease)
      checked.value = true
    } catch (error) {
      console.error('[ModLoader 更新] 检查更新失败:', error)
      statusText.value = '检查更新失败'
    } finally {
      checking.value = false
    }
  }

  /** 切换正式版或预览版后, 若已检测过则重新获取发布版本. */
  async function recompute (): Promise<void> {
    if (checked.value) {
      await check()
    }
  }

  /** 刷新本地 ModLoader 版本, 不依赖更新检查. */
  async function refreshLocalVersion (): Promise<void> {
    const ml = window.api?.modloader
    if (!ml) {
      return
    }
    const v = await readLocalModLoaderVersion(ml)
    if (v) {
      localVersion.value = v
    }
  }

  /** 显示更新详情, 跳转地址为 GitHub 发布版本页面. */
  async function showDialog (): Promise<void> {
    const l = latest.value
    if (!l) {
      return
    }
    await dialogs.showUpdate({
      name: `ModLoader${l.prerelease ? ' (预览版)' : ''}`,
      version: l.tag,
      changelog: l.body,
      url: l.htmlUrl,
    })
  }

  return { checking, checked, localVersion, hasUpdate, latest, statusText, check, showDialog, refreshLocalVersion, recompute }
}
