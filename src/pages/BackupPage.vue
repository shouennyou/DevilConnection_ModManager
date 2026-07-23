<template>
  <div class="backup-page">
    <v-container class="pa-4" fluid>
      <div v-if="backups.length > 0" class="backup-list">
        <BackupCard
          v-for="backup in backups"
          :key="backup.id"
          :backup="backup"
          @delete="handleDelete"
          @export="handleExport"
          @rename="handleRename"
          @restore="handleRestore"
          @toggle-lock="handleToggleLock"
        />
      </div>

      <div v-else class="text-center text-medium-emphasis py-12">
        <v-icon class="mb-2" icon="mdi-folder-zip-outline" size="48" />
        <div class="text-body-2">暂无存档备份</div>
        <div class="text-caption mt-1">点击顶栏「备份存档」创建</div>
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
  import type { BackupInfo } from '@/types/backup'
  import { onMounted, ref, watch } from 'vue'
  import BackupCard from '@/components/BackupCard.vue'
  import { useBackupActions } from '@/composables/useBackupActions'
  import { useBackupRunner } from '@/composables/useBackupRunner'
  import { useDialogs } from '@/composables/useDialogs'

  const dialogs = useDialogs()
  const { createSignal, importSignal } = useBackupActions()
  const { runCreate, runImport, runRestore, defaultBackupName } = useBackupRunner()

  const backups = ref<BackupInfo[]>([])

  function formatSize (bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  async function loadBackups () {
    const api = window.api?.backup
    if (!api) {
      console.warn('[备份页面] 备份接口不可用, 可能不在 Electron 环境中')
      return
    }
    try {
      const list = await api.list()
      backups.value = list.map(b => ({
        id: b.file,
        file: b.file,
        locked: b.locked,
        time: b.time,
        sizeText: formatSize(b.size),
      }))
    } catch (error) {
      console.error('[备份页面] 加载备份列表失败:', error)
    }
  }

  async function handleCreate () {
    const name = await dialogs.rename({
      title: '备份存档',
      label: '备份名称',
      initialValue: defaultBackupName(),
    })
    if (!name) return
    if (await runCreate(name.trim())) await loadBackups()
  }

  async function handleImport () {
    const res = await runImport()
    if (res.ok) await loadBackups()
  }

  async function handleToggleLock (id: string) {
    const api = window.api?.backup
    const b = backups.value.find(x => x.id === id)
    if (!api || !b) return
    const res = await api.setLock(b.file, !b.locked)
    await (res.success ? loadBackups() : dialogs.alert({ title: '操作失败', message: res.message || '' }))
  }

  async function handleExport (id: string) {
    const api = window.api?.backup
    const b = backups.value.find(x => x.id === id)
    if (!api || !b) return
    const res = await api.export(b.file)
    if (res.success) {
      await dialogs.alert({ title: '导出成功', message: `已导出到:\n${res.path}` })
    } else if (!res.canceled) {
      await dialogs.alert({ title: '导出失败', message: res.message || '' })
    }
  }

  async function handleRestore (id: string) {
    const b = backups.value.find(x => x.id === id)
    if (!b) return
    const ok = await dialogs.confirm({
      title: '恢复存档',
      message: `确定用「${b.file}」恢复吗?当前 _storage 存档会被清空并替换。`,
      confirmText: '恢复',
      cancelText: '取消',
      confirmColor: 'warning',
    })
    if (!ok) return
    if (await runRestore(b.file)) {
      await dialogs.alert({ title: '恢复成功', message: '存档已恢复,重启游戏后生效。' })
    }
  }

  async function handleRename (id: string) {
    const api = window.api?.backup
    const b = backups.value.find(x => x.id === id)
    if (!api || !b) return
    const currentName = b.file.replace(/\.zip$/i, '')
    const name = await dialogs.rename({ title: '重命名备份', label: '名称', initialValue: currentName })
    if (!name) return
    const res = await api.rename(b.file, name.trim())
    await (res.success ? loadBackups() : dialogs.alert({ title: '重命名失败', message: res.message || '' }))
  }

  async function handleDelete (id: string) {
    const api = window.api?.backup
    const b = backups.value.find(x => x.id === id)
    if (!api || !b) return
    const ok = await dialogs.confirm({
      title: '删除备份',
      message: `确定删除「${b.file}」吗?此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: 'error',
    })
    if (!ok) return
    const res = await api.delete(b.file)
    await (res.success ? loadBackups() : dialogs.alert({ title: '删除失败', message: res.message || '' }))
  }

  // 顶栏操作通过信号触发, 避免页面组件之间直接耦合.
  watch(createSignal, () => handleCreate())
  watch(importSignal, () => handleImport())

  onMounted(loadBackups)
</script>

<style scoped>
.backup-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
