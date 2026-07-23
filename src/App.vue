<template>
  <v-app>
    <TheNav v-if="!mobile" />
    <TheBottomNav v-if="mobile" />

    <v-main class="bg-background" style="padding-top: 88px;">
      <TheTopBar />

      <router-view v-slot="{ Component }">
        <transition mode="out-in" name="page-fade">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <ConfirmDialog ref="confirmRef" />
    <ModIssueDialog ref="modIssueRef" />
    <RenameDialog ref="renameRef" />
    <UpdateDialog ref="updateRef" />

    <ProgressDock />

    <transition name="loader-fade">
      <div v-if="loading" class="app-loader">
        <v-progress-circular color="primary" indeterminate size="48" />
      </div>
    </transition>
  </v-app>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useDisplay } from 'vuetify'
  import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
  import ModIssueDialog from '@/components/dialogs/ModIssueDialog.vue'
  import RenameDialog from '@/components/dialogs/RenameDialog.vue'
  import UpdateDialog from '@/components/dialogs/UpdateDialog.vue'
  import ProgressDock from '@/components/ProgressDock.vue'
  import TheBottomNav from '@/components/TheBottomNav.vue'
  import TheNav from '@/components/TheNav.vue'
  import TheTopBar from '@/components/TheTopBar.vue'
  import { useAppTheme } from '@/composables/useAppTheme'
  import { useDialogs } from '@/composables/useDialogs'
  import { useProgressStore } from '@/stores/progress'

  const { mobile } = useDisplay()
  const { initTheme } = useAppTheme()
  const { confirmRef, modIssueRef, renameRef, updateRef } = useDialogs()
  const progress = useProgressStore()

  const loading = ref(true)

  onMounted(() => {
    initTheme()
    setTimeout(() => {
      loading.value = false
    }, 600)

    // 下载完成由发起流程处理, 此处仅同步进行中的任务进度.
    window.api?.modmanager?.onDownloadProgress(data => {
      if (data.result !== undefined || data.total <= 0) return
      progress.update(data.fileName, Math.round((data.received / data.total) * 100))
    })
  })
</script>

<style scoped>
.app-loader {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-background));
  z-index: 9999;
}

.loader-fade-enter-active,
.loader-fade-leave-active {
  transition: opacity 0.4s ease;
}

.loader-fade-enter-from,
.loader-fade-leave-to {
  opacity: 0;
}

.page-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-fade-leave-active {
  transition: opacity 0.15s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-fade-leave-to {
  opacity: 0;
}
</style>
