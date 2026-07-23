<template>
  <v-container class="pa-4" fluid>
    <v-row density="comfortable">
      <v-col cols="6">
        <v-card class="pa-4 text-center" rounded="lg">
          <v-icon class="mb-2 text-primary" icon="mdi-puzzle-outline" size="28" />
          <div class="text-h4 font-weight-bold">{{ total }}</div>
          <div class="text-caption text-medium-emphasis">模组总数</div>
        </v-card>
      </v-col>

      <v-col cols="6">
        <v-card class="pa-4 text-center" rounded="lg">
          <v-icon class="mb-2 text-secondary" icon="mdi-check-circle-outline" size="28" />
          <div class="text-h4 font-weight-bold">{{ enabledCount }}</div>
          <div class="text-caption text-medium-emphasis">已启用</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card
      v-if="mlHasUpdate"
      class="pa-4 mt-4"
      color="primary"
      rounded="lg"
      variant="tonal"
    >
      <div class="d-flex align-center">
        <v-avatar class="mr-3" color="primary" size="42">
          <v-icon icon="mdi-rocket-launch-outline" size="22" />
        </v-avatar>

        <div class="flex-grow-1 min-w-0 mr-3">
          <div class="text-subtitle-2 font-weight-bold">ModLoader 有新版本</div>

          <div class="text-caption text-medium-emphasis text-truncate">
            {{ mlStatusText }}
          </div>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          @click="mlShowDialog"
        >
          查看详情
        </v-btn>
      </div>
    </v-card>

    <v-card class="pa-6 mt-4 text-center" rounded="lg">
      <v-icon
        class="mb-3"
        :color="canLaunch ? 'primary' : undefined"
        :icon="canLaunch ? 'mdi-gamepad-variant' : 'mdi-gamepad-variant-outline'"
        size="64"
      />

      <div class="text-body-2 text-medium-emphasis mb-2">
        {{ resourceText }}
      </div>

      <div
        v-if="steamReady"
        class="d-flex align-center justify-center gap-2 mb-2 text-caption"
      >
        <v-icon :color="steamStatusColor" :icon="steamStatusIcon" size="16" />
        <span :class="`text-${steamStatusColor}`">{{ steamStatusText }}</span>
      </div>

      <div
        v-if="appStore.autoBackup"
        class="d-flex align-center justify-center gap-2 mb-4 text-caption"
      >
        <v-progress-circular
          v-if="backupStatus.status === 'running'"
          color="primary"
          indeterminate
          size="16"
          width="2"
        />

        <v-icon
          v-else-if="backupStatus.status === 'success'"
          color="success"
          icon="mdi-check-circle"
          size="16"
        />

        <v-icon
          v-else-if="backupStatus.status === 'error'"
          color="error"
          icon="mdi-alert-circle"
          size="16"
        />

        <span :class="backupStatusColor">{{ backupStatusText }}</span>

        <v-btn
          v-if="backupStatus.status === 'error'"
          size="x-small"
          variant="text"
          @click="retryBackup"
        >
          重试
        </v-btn>
      </div>

      <div v-else class="mb-4" />

      <v-btn
        block
        color="primary"
        :disabled="!canLaunch || isLaunching"
        :loading="isLaunching"
        prepend-icon="mdi-play"
        size="large"
        @click="launchGame"
      >
        启动游戏
      </v-btn>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import type { ModOrderEntry } from '@/types/window-api'
  import { computed, onMounted, ref } from 'vue'
  import { useBackupRunner } from '@/composables/useBackupRunner'
  import { useModIssueCheck } from '@/composables/useModIssueCheck'
  import { useModLoaderUpdate } from '@/composables/useModLoaderUpdate'
  import { useAppStore } from '@/stores/app'
  import { useBackupStatusStore } from '@/stores/backupStatus'
  import { MOD_ORDER_PATH } from '@/utils/mod-order'

  /** 游戏核心归档不计入模组统计. */
  const SYSTEM_FILES = new Set(['app.asar', 'app.bak.asar'])

  const appStore = useAppStore()
  const backupStatus = useBackupStatusStore()
  const { runAutoBackup } = useBackupRunner()
  const { checkBeforeLaunch } = useModIssueCheck()
  const {
    hasUpdate: mlHasUpdate,
    statusText: mlStatusText,
    check: mlCheck,
    showDialog: mlShowDialog,
  } = useModLoaderUpdate()

  const total = ref(0)
  const enabledCount = ref(0)
  const gameResourceOk = ref(false)
  const isLaunching = ref(false)

  /** Steam 状态, 分别记录模式开关, 连接状态和首次读取状态. */
  const steamConfigured = ref(false)
  const steamActive = ref(false)
  const steamReady = ref(false)

  const resourceText = computed(() =>
    gameResourceOk.value
      ? '已检测到游戏资源'
      : '未检测到游戏核心资源(app.asar / app.bak.asar)',
  )

  /** Steam 模式关闭时直接通过, 开启后必须已连接. */
  const steamOk = computed(() => !steamConfigured.value || steamActive.value)

  const steamStatusText = computed(() => {
    if (!steamConfigured.value) return 'Steam 模式已关闭'
    return steamActive.value ? 'Steam 已连接' : 'Steam 未连接,无法启动游戏'
  })

  const steamStatusColor = computed(() => {
    if (!steamConfigured.value) return 'medium-emphasis'
    return steamActive.value ? 'success' : 'error'
  })

  const steamStatusIcon = computed(() => {
    if (!steamConfigured.value) return 'mdi-steam'
    return steamActive.value ? 'mdi-check-circle' : 'mdi-alert-circle'
  })

  /** 游戏资源和 Steam 状态满足后, 自动备份开启时还需备份成功. */
  const canLaunch = computed(() => {
    if (!gameResourceOk.value) return false
    if (!steamOk.value) return false
    if (!appStore.autoBackup) return true
    return backupStatus.status === 'success'
  })

  const backupStatusText = computed(() => {
    switch (backupStatus.status) {
      case 'running': { return '正在备份存档...'
      }
      case 'success': { return backupStatus.message || '备份完成,可以进入游戏'
      }
      case 'error': { return `备份失败: ${backupStatus.message}`
      }
      default: { return '等待备份'
      }
    }
  })

  const backupStatusColor = computed(() => {
    switch (backupStatus.status) {
      case 'success': { return 'text-success'
      }
      case 'error': { return 'text-error'
      }
      default: { return 'text-medium-emphasis'
      }
    }
  })

  async function load () {
    const api = window.api?.modmanager
    if (!api) return

    // 读取模组顺序并排除游戏核心归档.
    try {
      const content = await api.readFile(MOD_ORDER_PATH)
      const list = (content ? JSON.parse(content) : []) as ModOrderEntry[]
      const mods = list.filter(e => e && e.file && !SYSTEM_FILES.has(e.file))
      total.value = mods.length
      enabledCount.value = mods.filter(m => m.enabled !== false).length
    } catch (error) {
      console.error('[主页] 读取模组统计失败:', error)
    }

    // app.asar 或 app.bak.asar 存在时即可启动游戏.
    try {
      const res = await api.checkGameResources()
      gameResourceOk.value = res.appAsar || res.appBakAsar
    } catch (error) {
      console.error('[主页] 检测游戏资源失败:', error)
    }

    // Steam 模式开启但未连接时禁止启动游戏.
    try {
      const status = await window.api?.getSteamStatus?.()
      if (status) {
        steamConfigured.value = Boolean(status.configured)
        steamActive.value = Boolean(status.active)
        steamReady.value = true
      }
    } catch (error) {
      console.error('[主页] 获取 Steam 状态失败:', error)
    }
  }

  async function retryBackup () {
    backupStatus.done = false
    await runAutoBackup()
  }

  async function launchGame () {
    if (!canLaunch.value || isLaunching.value) return

    isLaunching.value = true
    try {
      if (!await checkBeforeLaunch()) return
      await window.api?.launchGame?.()
    } finally {
      isLaunching.value = false
    }
  }

  onMounted(() => {
    load()
    // 仅在设置开启时自动检查更新.
    if (appStore.autoCheckUpdate) mlCheck()
    // 延后执行一次自动备份, 避免阻塞主页初始化.
    if (appStore.autoBackup && !backupStatus.done) {
      setTimeout(() => runAutoBackup(), 800)
    }
  })
</script>
