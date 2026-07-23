<template>
  <v-card class="backup-card">
    <v-card-text class="pa-4">
      <div class="text-subtitle-1 font-weight-bold text-truncate mb-2">
        {{ backup.file }}
      </div>

      <div class="text-caption text-medium-emphasis">
        <span>{{ formattedTime }}</span>
        <span v-if="backup.sizeText"> · {{ backup.sizeText }}</span>
      </div>
    </v-card-text>

    <v-divider />

    <v-card-actions class="px-3 py-2">
      <v-btn
        :color="backup.locked ? 'warning' : 'primary'"
        :prepend-icon="backup.locked ? 'mdi-lock-open-variant-outline' : 'mdi-lock-outline'"
        variant="tonal"
        @click="emit('toggle-lock', backup.id)"
      >
        {{ backup.locked ? '解锁' : '锁定' }}
      </v-btn>

      <v-btn
        icon="mdi-export-variant"
        title="导出"
        variant="text"
        @click="emit('export', backup.id)"
      />

      <v-btn
        icon="mdi-backup-restore"
        title="恢复"
        variant="text"
        @click="emit('restore', backup.id)"
      />

      <v-spacer />

      <v-btn
        icon="mdi-pencil-outline"
        title="改名"
        variant="text"
        @click="emit('rename', backup.id)"
      />

      <v-btn
        color="error"
        :disabled="backup.locked"
        icon="mdi-delete-outline"
        :title="backup.locked ? '已锁定,请先解锁' : '删除'"
        variant="text"
        @click="emit('delete', backup.id)"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
  import type { BackupInfo } from '@/types/backup'
  import { computed } from 'vue'

  const props = defineProps({
    backup: {
      type: Object as () => BackupInfo,
      required: true,
    },
  })

  const emit = defineEmits<{
    'toggle-lock': [id: string]
    'export': [id: string]
    'restore': [id: string]
    'rename': [id: string]
    'delete': [id: string]
  }>()

  const formattedTime = computed(() => {
    const d = new Date(props.backup.time)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  })
</script>

<style scoped>
.backup-card {
  transition: box-shadow 0.2s ease;
}

.backup-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
