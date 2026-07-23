<template>
  <div class="progress-dock">
    <transition-group name="dock">
      <v-card
        v-for="task in tasks"
        :key="task.id"
        class="dock-card"
        elevation="8"
      >
        <div class="d-flex align-center gap-2 mb-1">
          <v-progress-circular
            v-if="task.status === 'running'"
            color="primary"
            indeterminate
            size="16"
            width="2"
          />

          <v-icon
            v-else-if="task.status === 'success'"
            color="success"
            icon="mdi-check-circle"
            size="18"
          />

          <v-icon
            v-else
            color="error"
            icon="mdi-alert-circle"
            size="18"
          />

          <span class="text-caption font-weight-bold flex-grow-1 text-truncate">
            {{ task.title }}
          </span>

          <v-btn
            v-if="task.status !== 'running'"
            density="comfortable"
            icon="mdi-close"
            size="x-small"
            variant="text"
            @click="progress.remove(task.id)"
          />
        </div>

        <div class="text-caption text-medium-emphasis text-truncate mb-1">
          {{ task.label }}
        </div>

        <div v-if="task.status === 'running'" class="d-flex align-center gap-2">
          <v-progress-linear
            class="flex-grow-1"
            color="primary"
            height="6"
            :indeterminate="task.indeterminate"
            :model-value="task.indeterminate ? undefined : task.percent"
            rounded
          />

          <span v-if="!task.indeterminate" class="text-caption text-medium-emphasis">{{ task.percent }}%</span>
        </div>

        <div v-else-if="task.status === 'error'" class="text-caption text-error text-truncate">
          {{ task.message || '操作失败' }}
        </div>

        <div v-else class="text-caption text-success">
          已完成
        </div>
      </v-card>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useProgressStore } from '@/stores/progress'

  const progress = useProgressStore()
  const { tasks } = storeToRefs(progress)
</script>

<style scoped>
.progress-dock {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.dock-card {
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  pointer-events: auto;
}

.dock-enter-active,
.dock-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
