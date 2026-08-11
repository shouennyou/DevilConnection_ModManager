import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

interface AppState {
  themeMode: ThemeMode
  /** 启动时自动备份存档. */
  autoBackup: boolean
  /** 自动备份保留天数, 小于等于 0 时不限制. */
  backupRetainDays: number
  /** 自动备份保留份数, 小于等于 0 时不限制. */
  backupRetainCount: number
  /** 检查更新时是否包含预览版. */
  checkPreRelease: boolean
  /** 启动后自动检测 ModLoader 更新. */
  autoCheckUpdate: boolean
  /** 启动游戏窗口时自动打开开发者工具. */
  debugMode: boolean
}

const DEFAULTS: AppState = {
  themeMode: 'system',
  autoBackup: true,
  backupRetainDays: 7,
  backupRetainCount: 5,
  checkPreRelease: false,
  autoCheckUpdate: true,
  debugMode: false,
}

const CONFIG_PATH = 'config/mod-manager.json'
const LEGACY_CONFIG_PATH = 'config/modloader.json'

function parseConfig (text: string | null): Record<string, unknown> | null {
  if (!text) {
    return null
  }
  try {
    const config: unknown = JSON.parse(text)
    return config !== null && typeof config === 'object' ? config as Record<string, unknown> : null
  } catch (error) {
    console.error('[应用配置] 解析配置失败:', error)
    return null
  }
}

/** 读取配置, 首次读取时将旧版 modloader.json 迁移至新路径. */
function readConfig (): Record<string, unknown> {
  try {
    const api = window.modloader
    if (!api) {
      return {}
    }

    const current = parseConfig(api.readFileSync(CONFIG_PATH))
    if (current) {
      return current
    }

    const legacy = parseConfig(api.readFileSync(LEGACY_CONFIG_PATH))
    if (legacy) {
      void api.writeFile(CONFIG_PATH, JSON.stringify(legacy, null, 2))
      return legacy
    }
  } catch (error) {
    console.error('[应用配置] 读取配置失败:', error)
    return {}
  }
  return {}
}

function loadSettings (): AppState {
  const cfg = readConfig()
  return {
    themeMode: (cfg.themeMode as ThemeMode) ?? DEFAULTS.themeMode,
    autoBackup: typeof cfg.autoBackup === 'boolean' ? cfg.autoBackup : DEFAULTS.autoBackup,
    backupRetainDays: typeof cfg.backupRetainDays === 'number' ? cfg.backupRetainDays : DEFAULTS.backupRetainDays,
    backupRetainCount: typeof cfg.backupRetainCount === 'number' ? cfg.backupRetainCount : DEFAULTS.backupRetainCount,
    checkPreRelease: typeof cfg.checkPreRelease === 'boolean' ? cfg.checkPreRelease : DEFAULTS.checkPreRelease,
    autoCheckUpdate: typeof cfg.autoCheckUpdate === 'boolean' ? cfg.autoCheckUpdate : DEFAULTS.autoCheckUpdate,
    debugMode: typeof cfg.debugMode === 'boolean' ? cfg.debugMode : DEFAULTS.debugMode,
  }
}

export const useAppStore = defineStore('app', () => {
  const settings = loadSettings()

  const themeMode = ref<ThemeMode>(settings.themeMode)
  const autoBackup = ref<boolean>(settings.autoBackup)
  const backupRetainDays = ref<number>(settings.backupRetainDays)
  const backupRetainCount = ref<number>(settings.backupRetainCount)
  const checkPreRelease = ref<boolean>(settings.checkPreRelease)
  const autoCheckUpdate = ref<boolean>(settings.autoCheckUpdate)
  const debugMode = ref<boolean>(settings.debugMode)

  function persist (): void {
    const api = window.modloader
    if (!api) {
      return
    }
    const next = {
      ...readConfig(),
      themeMode: themeMode.value,
      autoBackup: autoBackup.value,
      backupRetainDays: backupRetainDays.value,
      backupRetainCount: backupRetainCount.value,
      checkPreRelease: checkPreRelease.value,
      autoCheckUpdate: autoCheckUpdate.value,
      debugMode: debugMode.value,
    }
    void api.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2))
  }

  function setThemeMode (mode: ThemeMode): void {
    themeMode.value = mode
    persist()
  }

  function setAutoBackup (value: boolean): void {
    autoBackup.value = value
    persist()
  }

  function setBackupRetainDays (value: number): void {
    backupRetainDays.value = value
    persist()
  }

  function setBackupRetainCount (value: number): void {
    backupRetainCount.value = value
    persist()
  }

  function setCheckPreRelease (value: boolean): void {
    checkPreRelease.value = value
    persist()
  }

  function setAutoCheckUpdate (value: boolean): void {
    autoCheckUpdate.value = value
    persist()
  }

  function setDebugMode (value: boolean): void {
    debugMode.value = value
    persist()
  }

  return {
    themeMode,
    autoBackup,
    backupRetainDays,
    backupRetainCount,
    checkPreRelease,
    autoCheckUpdate,
    debugMode,
    setThemeMode,
    setAutoBackup,
    setBackupRetainDays,
    setBackupRetainCount,
    setCheckPreRelease,
    setAutoCheckUpdate,
    setDebugMode,
  }
})
