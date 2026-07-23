<template>
  <v-app-bar class="app-bar" flat>
    <div class="top-bar-row">
      <div class="top-bar-title">
        {{ pageTitle }}
      </div>

      <div class="top-bar-entries">
        <v-btn
          v-if="showModCheck"
          :disabled="isCheckingModIssues"
          icon="mdi-shield-search"
          :loading="isCheckingModIssues"
          size="small"
          title="重新校验模组"
          variant="text"
          @click="checkModIssues"
        />

        <v-btn
          v-if="showWorkshopRefresh"
          icon="mdi-refresh"
          size="small"
          title="刷新工坊"
          variant="text"
          @click="requestRefresh"
        />

        <v-btn
          v-if="showBack"
          icon="mdi-arrow-left"
          size="small"
          title="返回"
          variant="text"
          @click="$router.back()"
        />

        <v-btn
          v-if="showWorkshop"
          icon="mdi-store-outline"
          size="small"
          title="模组工坊"
          variant="text"
          @click="$router.push('/workshop')"
        />

        <v-btn
          v-if="showInstall"
          icon="mdi-plus"
          size="small"
          title="安装模组"
          variant="text"
          @click="requestInstall"
        />

        <v-btn
          v-if="showCreateBackup"
          icon="mdi-content-save-plus-outline"
          size="small"
          title="备份存档"
          variant="text"
          @click="requestCreateBackup"
        />

        <v-btn
          v-if="showCreateBackup"
          icon="mdi-plus"
          size="small"
          title="导入备份"
          variant="text"
          @click="requestImportBackup"
        />

        <v-btn
          v-if="showAbout"
          icon="mdi-information-outline"
          size="small"
          title="关于"
          variant="text"
          @click="$router.push('/about')"
        />

        <div v-if="!showBack && !showModCheck && !showWorkshopRefresh && !showWorkshop && !showAbout && !showInstall && !showCreateBackup" class="entry-placeholder" />
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useBackupActions } from '@/composables/useBackupActions'
  import { useModActions } from '@/composables/useModActions'
  import { useModIssueCheck } from '@/composables/useModIssueCheck'
  import { useWorkshopActions } from '@/composables/useWorkshopActions'

  const route = useRoute()
  const { mobile } = useDisplay()
  const { requestInstall } = useModActions()
  const { checkCurrentStatus } = useModIssueCheck()
  const { requestCreate: requestCreateBackup, requestImport: requestImportBackup } = useBackupActions()
  const { requestRefresh } = useWorkshopActions()
  const isCheckingModIssues = ref(false)

  const pageTitle = computed(() => {
    const map: Record<string, string> = {
      home: '主页',
      mods: '模组管理',
      workshop: '模组工坊',
      backup: '存档备份',
      settings: '全局设置',
      about: '关于',
    }
    return map[route.name as string] ?? ''
  })

  const showWorkshop = computed(() => route.name === 'mods')
  const showModCheck = computed(() => route.name === 'mods')
  const showWorkshopRefresh = computed(() => route.name === 'workshop')
  const showInstall = computed(() => route.name === 'mods')
  const showCreateBackup = computed(() => route.name === 'backup')
  const showAbout = computed(() => route.name === 'home')
  // 仅在移动端的工坊和关于页面显示返回按钮.
  const showBack = computed(() => mobile.value && (route.name === 'workshop' || route.name === 'about'))

  async function checkModIssues () {
    if (isCheckingModIssues.value) {
      return
    }

    isCheckingModIssues.value = true
    try {
      await checkCurrentStatus()
    } finally {
      isCheckingModIssues.value = false
    }
  }
</script>

<style scoped>
.app-bar {
  border-bottom: none !important;
  background: transparent !important;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: auto !important;
  min-height: 88px !important;
  padding: 12px 20px 20px;
}

.top-bar-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.top-bar-entries {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  flex-shrink: 0;
}

.entry-placeholder {
  width: 36px;
}

.top-bar-title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
}
</style>
