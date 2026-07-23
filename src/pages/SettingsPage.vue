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

  </v-container>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useAppTheme } from '@/composables/useAppTheme'
  import { useDialogs } from '@/composables/useDialogs'
  import { useModLoaderUpdate } from '@/composables/useModLoaderUpdate'
  import { useAppStore } from '@/stores/app'

  const store = useAppStore()
  const { setThemeMode } = useAppTheme()
  const { confirm } = useDialogs()

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

  const checkPreRelease = ref(store.checkPreRelease)
  watch(checkPreRelease, v => {
    store.setCheckPreRelease(v)
    // 已检查过更新时, 切换版本渠道后重新计算结果.
    void recomputeUpdate()
  })

  const steamEnabled = ref(false)
  const steamLoading = ref(true)

  onMounted(async () => {
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
