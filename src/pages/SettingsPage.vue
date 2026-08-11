<template>
  <v-container class="pa-4" fluid>
    <v-card rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          外观
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-theme-light-dark</v-icon>
          </template>

          <v-list-item-title>主题模式</v-list-item-title>

          <v-list-item-subtitle>
            {{ themeModeText }}
          </v-list-item-subtitle>

          <template #append>
            <v-btn-toggle
              v-model="selectedMode"
              color="primary"
              density="compact"
              mandatory
              variant="outlined"
            >
              <v-btn title="浅色" value="light">
                <v-icon size="20">mdi-weather-sunny</v-icon>
              </v-btn>

              <v-btn title="深色" value="dark">
                <v-icon size="20">mdi-weather-night</v-icon>
              </v-btn>

              <v-btn title="跟随系统" value="system">
                <v-icon size="20">mdi-monitor</v-icon>
              </v-btn>
            </v-btn-toggle>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          程序数据
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-folder-cog-outline</v-icon>
          </template>

          <v-list-item-title>数据目录</v-list-item-title>

          <v-list-item-subtitle
            class="text-truncate"
            :title="dataDirectoryPath || undefined"
          >
            {{ dataDirectoryPath || '正在读取...' }}
          </v-list-item-subtitle>

          <template #append>
            <v-progress-circular
              v-if="dataDirectoryLoading"
              color="primary"
              indeterminate
              size="22"
              width="2"
            />

            <v-btn
              v-else
              icon="mdi-folder-open-outline"
              title="打开数据目录"
              variant="text"
              @click="openDataDirectory"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          游戏核心
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon :color="gameCoreStatus.exists ? 'success' : undefined">mdi-package-variant-closed</v-icon>
          </template>

          <v-list-item-title>游戏核心文件</v-list-item-title>

          <v-list-item-subtitle class="text-truncate">
            {{ gameCoreStatusText }}
          </v-list-item-subtitle>

          <template #append>
            <v-progress-circular
              v-if="gameCoreLoading"
              color="primary"
              indeterminate
              size="22"
              width="2"
            />

            <template v-else>
              <v-btn
                icon="mdi-folder-open-outline"
                title="选择游戏核心文件"
                variant="text"
                @click="selectGameCore"
              />

              <v-btn
                v-if="gameCoreStatus.configured"
                icon="mdi-close"
                title="清除游戏核心文件"
                variant="text"
                @click="clearGameCore"
              />
            </template>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          存档备份
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-backup-restore</v-icon>
          </template>

          <v-list-item-title>启动时自动备份</v-list-item-title>
          <v-list-item-subtitle>每次启动程序时自动备份存档</v-list-item-subtitle>

          <template #append>
            <v-switch
              v-model="autoBackup"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-calendar-clock</v-icon>
          </template>

          <v-list-item-title>保留天数</v-list-item-title>
          <v-list-item-subtitle>只保留 N 天内的自动备份(0 = 不限)</v-list-item-subtitle>

          <template #append>
            <v-text-field
              v-model.number="retainDays"
              density="compact"
              :disabled="!autoBackup"
              hide-details
              min="0"
              style="width: 88px"
              type="number"
              variant="outlined"
            />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-counter</v-icon>
          </template>

          <v-list-item-title>保留份数</v-list-item-title>
          <v-list-item-subtitle>最多保留 N 份(0 = 不限,锁定的不计入)</v-list-item-subtitle>

          <template #append>
            <v-text-field
              v-model.number="retainCount"
              density="compact"
              :disabled="!autoBackup"
              hide-details
              min="0"
              style="width: 88px"
              type="number"
              variant="outlined"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          存档导入
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon :color="saveImportStatus.exists ? 'success' : undefined">mdi-folder-account-outline</v-icon>
          </template>

          <v-list-item-title>原版存档文件夹</v-list-item-title>

          <v-list-item-subtitle
            class="text-truncate"
            :title="saveImportStatus.path || undefined"
          >
            {{ saveImportStatusText }}
          </v-list-item-subtitle>

          <template #append>
            <v-progress-circular
              v-if="saveImportLoading"
              color="primary"
              indeterminate
              size="22"
              width="2"
            />

            <template v-else>
              <v-btn
                icon="mdi-folder-open-outline"
                title="选择原版存档文件夹"
                variant="text"
                @click="selectSaveImportDirectory"
              />

              <v-btn
                v-if="saveImportStatus.configured"
                icon="mdi-close"
                title="清除原版存档文件夹"
                variant="text"
                @click="clearSaveImportDirectory"
              />
            </template>
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-file-import-outline</v-icon>
          </template>

          <v-list-item-title>复制导入存档</v-list-item-title>
          <v-list-item-subtitle>复制所选文件夹顶层的 .sav 文件, 不会修改原版存档</v-list-item-subtitle>

          <template #append>
            <v-btn
              color="primary"
              :disabled="!canImportSaves || saveImportLoading"
              prepend-icon="mdi-file-import-outline"
              variant="flat"
              @click="importSaves"
            >
              导入
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          平台
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-steam</v-icon>
          </template>

          <v-list-item-title>Steam 模式</v-list-item-title>

          <v-list-item-subtitle>
            开启后接入 Steam 平台(成就、截图等)；非 Steam 平台请关闭。<br>切换后需退出程序并手动重启生效。
          </v-list-item-subtitle>

          <template #append>
            <v-switch
              v-model="steamEnabled"
              color="primary"
              density="compact"
              :disabled="steamLoading"
              hide-details
              inset
              @update:model-value="onToggleSteam"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          更新
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-cloud-sync-outline</v-icon>
          </template>

          <v-list-item-title>启动后自动检测更新</v-list-item-title>
          <v-list-item-subtitle>启动应用时自动检查 ModLoader 更新</v-list-item-subtitle>

          <template #append>
            <v-switch
              v-model="autoCheckUpdate"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-flask-outline</v-icon>
          </template>

          <v-list-item-title>检测预览版更新</v-list-item-title>
          <v-list-item-subtitle>检查 ModLoader 更新时包含 Pre-release 预览版</v-list-item-subtitle>

          <template #append>
            <v-switch
              v-model="checkPreRelease"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card class="mt-4" rounded="lg">
      <v-list lines="two">
        <v-list-subheader class="text-uppercase font-weight-bold">
          开发
        </v-list-subheader>

        <v-list-item>
          <template #prepend>
            <v-icon>mdi-bug-outline</v-icon>
          </template>

          <v-list-item-title>Debug 模式</v-list-item-title>
          <v-list-item-subtitle>启用后, 启动游戏窗口时自动打开开发者工具</v-list-item-subtitle>

          <template #append>
            <v-switch
              v-model="debugMode"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

  </v-container>
</template>

<script setup lang="ts">
  import type { SaveImportStatus } from '@/types/window-api'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useAppTheme } from '@/composables/useAppTheme'
  import { useDialogs } from '@/composables/useDialogs'
  import { useModLoaderUpdate } from '@/composables/useModLoaderUpdate'
  import { useAppStore } from '@/stores/app'

  const store = useAppStore()
  const { setThemeMode } = useAppTheme()
  const { alert, confirm } = useDialogs()

  const selectedMode = ref(store.themeMode)
  watch(selectedMode, val => {
    setThemeMode(val)
  })

  const themeModeText = computed(() => {
    const map: Record<string, string> = {
      light: '浅色模式',
      dark: '深色模式',
      system: '跟随系统',
    }
    return map[store.themeMode] ?? '跟随系统'
  })

  const autoBackup = ref(store.autoBackup)
  const retainDays = ref(store.backupRetainDays)
  const retainCount = ref(store.backupRetainCount)

  watch(autoBackup, v => store.setAutoBackup(v))
  watch(retainDays, v => store.setBackupRetainDays(Number(v) || 0))
  watch(retainCount, v => store.setBackupRetainCount(Number(v) || 0))

  const { recompute: recomputeUpdate } = useModLoaderUpdate()

  const autoCheckUpdate = ref(store.autoCheckUpdate)
  watch(autoCheckUpdate, v => store.setAutoCheckUpdate(v))

  const debugMode = ref(store.debugMode)
  watch(debugMode, v => store.setDebugMode(v))

  const checkPreRelease = ref(store.checkPreRelease)
  watch(checkPreRelease, v => {
    store.setCheckPreRelease(v)
    // 已检查过更新时, 切换版本渠道后重新计算结果.
    void recomputeUpdate()
  })

  const steamEnabled = ref(false)
  const steamLoading = ref(true)
  const dataDirectoryLoading = ref(true)
  const dataDirectoryPath = ref('')
  const gameCoreLoading = ref(false)
  const gameCoreStatus = ref({ path: null as string | null, configured: false, exists: false })
  const saveImportLoading = ref(false)
  const saveImportStatus = ref<SaveImportStatus>({ path: null, configured: false, exists: false, count: 0 })

  const gameCoreStatusText = computed(() => {
    if (gameCoreStatus.value.exists) return gameCoreStatus.value.path || '已选择游戏核心文件'
    if (gameCoreStatus.value.configured) return '所选文件无法访问，请重新选择'
    return '请选择游戏安装目录中的核心 .asar 文件'
  })

  const saveImportStatusText = computed(() => {
    const status = saveImportStatus.value
    if (status.exists) return `${status.path} (${status.count} 个可导入存档)`
    if (status.configured) return '所选文件夹无法访问, 请重新选择'
    return '请选择包含 .sav 文件的原版存档文件夹'
  })

  const canImportSaves = computed(() => {
    return saveImportStatus.value.exists && saveImportStatus.value.count > 0
  })

  async function loadDataDirectory (): Promise<void> {
    const api = window.modmanager
    if (!api) return
    dataDirectoryLoading.value = true
    try {
      dataDirectoryPath.value = await api.getDataDirectory()
    } catch (error) {
      console.error('[设置页面] 读取程序数据目录失败:', error)
    } finally {
      dataDirectoryLoading.value = false
    }
  }

  async function openDataDirectory (): Promise<void> {
    const api = window.modmanager
    if (!api || dataDirectoryLoading.value) return
    dataDirectoryLoading.value = true
    try {
      const result = await api.openDataDirectory()
      dataDirectoryPath.value = result.path
      if (!result.success) {
        await alert({ title: '打开失败', message: result.message || '无法打开程序数据目录' })
      }
    } catch (error) {
      console.error('[设置页面] 打开程序数据目录失败:', error)
      await alert({ title: '打开失败', message: '无法打开程序数据目录' })
    } finally {
      dataDirectoryLoading.value = false
    }
  }

  async function loadGameCoreStatus (): Promise<void> {
    const api = window.modmanager
    if (!api) return
    try {
      gameCoreStatus.value = await api.getGameCoreStatus()
    } catch (error) {
      console.error('[设置页面] 读取游戏核心状态失败:', error)
    }
  }

  async function selectGameCore (): Promise<void> {
    const api = window.modmanager
    if (!api || gameCoreLoading.value) return
    gameCoreLoading.value = true
    try {
      const result = await api.selectGameCoreFile()
      if (!result.success && !result.canceled) {
        await alert({ title: '选择失败', message: result.message || '无法保存游戏核心文件路径' })
      }
      await loadGameCoreStatus()
    } catch (error) {
      console.error('[设置页面] 选择游戏核心失败:', error)
      await alert({ title: '选择失败', message: '无法选择游戏核心文件' })
    } finally {
      gameCoreLoading.value = false
    }
  }

  async function clearGameCore (): Promise<void> {
    const api = window.modmanager
    if (!api || gameCoreLoading.value) return
    const ok = await confirm({
      title: '清除游戏核心',
      message: '清除后将无法启动游戏，直到重新选择核心文件。源文件不会被删除。',
      confirmText: '清除',
      cancelText: '取消',
      confirmColor: 'error',
    })
    if (!ok) return

    gameCoreLoading.value = true
    try {
      const result = await api.clearGameCoreFile()
      if (!result.success) {
        await alert({ title: '清除失败', message: result.message || '无法清除游戏核心文件路径' })
      }
      await loadGameCoreStatus()
    } catch (error) {
      console.error('[设置页面] 清除游戏核心失败:', error)
      await alert({ title: '清除失败', message: '无法清除游戏核心文件路径' })
    } finally {
      gameCoreLoading.value = false
    }
  }

  async function loadSaveImportStatus (): Promise<void> {
    const api = window.modmanager
    if (!api) return
    try {
      saveImportStatus.value = await api.getSaveImportStatus()
    } catch (error) {
      console.error('[设置页面] 读取存档导入状态失败:', error)
    }
  }

  async function selectSaveImportDirectory (): Promise<void> {
    const api = window.modmanager
    if (!api || saveImportLoading.value) return
    saveImportLoading.value = true
    try {
      const result = await api.selectSaveImportDirectory()
      if (!result.success && !result.canceled) {
        await alert({ title: '选择失败', message: result.message || '无法保存存档文件夹路径' })
      }
      await loadSaveImportStatus()
    } catch (error) {
      console.error('[设置页面] 选择存档文件夹失败:', error)
      await alert({ title: '选择失败', message: '无法选择存档文件夹' })
    } finally {
      saveImportLoading.value = false
    }
  }

  async function clearSaveImportDirectory (): Promise<void> {
    const api = window.modmanager
    if (!api || saveImportLoading.value) return
    const ok = await confirm({
      title: '清除存档文件夹',
      message: '清除后不会删除原版存档, 之后需要重新选择才能导入.',
      confirmText: '清除',
      cancelText: '取消',
      confirmColor: 'error',
    })
    if (!ok) return

    saveImportLoading.value = true
    try {
      const result = await api.clearSaveImportDirectory()
      if (!result.success) {
        await alert({ title: '清除失败', message: result.message || '无法清除存档文件夹路径' })
      }
      await loadSaveImportStatus()
    } catch (error) {
      console.error('[设置页面] 清除存档文件夹失败:', error)
      await alert({ title: '清除失败', message: '无法清除存档文件夹路径' })
    } finally {
      saveImportLoading.value = false
    }
  }

  async function importSaves (): Promise<void> {
    const api = window.modmanager
    if (!api || !canImportSaves.value || saveImportLoading.value) return

    saveImportLoading.value = true
    try {
      let result = await api.importSaves()
      if (result.needsConfirmation) {
        const ok = await confirm({
          title: '替换独立版存档',
          message: `独立版当前有 ${result.existingCount || 0} 个存档. 导入会先清空这些存档, 再复制原版存档. 原版文件不会被修改.`,
          confirmText: '清空并导入',
          cancelText: '取消',
          confirmColor: 'warning',
        })
        if (!ok) return
        result = await api.importSaves(true)
      }
      await (result.success
        ? alert({ title: '导入成功', message: `已复制 ${result.count || 0} 个存档到独立版, 重启游戏后即可读取.` })
        : alert({ title: '导入失败', message: result.message || '无法导入存档' }))
      await loadSaveImportStatus()
    } catch (error) {
      console.error('[设置页面] 导入存档失败:', error)
      await alert({ title: '导入失败', message: '无法导入存档' })
    } finally {
      saveImportLoading.value = false
    }
  }

  onMounted(async () => {
    await Promise.all([
      loadDataDirectory(),
      loadGameCoreStatus(),
      loadSaveImportStatus(),
    ])
    try {
      steamEnabled.value = await window.api?.getSteamEnabled?.() === true
    } catch (error) {
      console.error('[设置页面] 读取 Steam 开关状态失败:', error)
      // 非 Electron 环境或读取失败时保持默认关闭.
    } finally {
      steamLoading.value = false
    }
  })

  async function onToggleSteam (value: boolean | null): Promise<void> {
    const want = value === true
    const ok = await confirm({
      title: '需要重启',
      message: `${want ? '开启' : '关闭'} Steam 模式需退出程序,并由你手动重新启动后生效。是否立即退出?`,
      confirmText: '退出程序',
      cancelText: '取消',
    })
    if (!ok) {
      // 用户取消后回滚开关.
      steamEnabled.value = !want
      return
    }
    // 写入配置后退出程序, 由用户手动重启使配置生效.
    steamLoading.value = true
    await window.api?.setSteamEnabled?.(want)
  }

</script>
