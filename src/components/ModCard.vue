<template>
  <v-card class="mod-card">
    <v-card-text class="pa-4">
      <div class="mod-card__header mb-2">
        <span class="mod-card__name text-subtitle-1 font-weight-bold text-truncate">
          {{ displayName }}
        </span>

        <v-chip class="mod-card__priority" color="primary" size="x-small" variant="tonal">
          优先级 {{ mod.order }}
        </v-chip>

        <v-switch
          class="mod-card__switch"
          color="primary"
          density="compact"
          hide-details
          :model-value="mod.enabled"
          :title="mod.enabled ? '已启用' : '已禁用'"
          @update:model-value="emit('toggle', mod.order)"
        />
      </div>

      <div class="text-caption text-medium-emphasis mb-2">
        <span v-if="mod.version">{{ mod.version }}</span>
        <span v-if="mod.author?.length"> · {{ mod.author.join(', ') }}</span>
        <span v-if="mod.sizeText"> · {{ mod.sizeText }}</span>
      </div>

      <p
        v-if="mod.description"
        class="multiline-text text-body-2 text-medium-emphasis mb-0"
      >
        {{ mod.description }}
      </p>

      <div
        v-if="mod.duplicate || mod.dependencyIssue || mod.conflictIssue || mod.hasUpdate"
        class="mod-card__chips mt-3"
      >
        <v-chip
          v-if="mod.duplicate"
          color="error"
          prepend-icon="mdi-alert-circle-outline"
          size="x-small"
          variant="flat"
        >
          id 重复: {{ mod.id }}
        </v-chip>

        <v-chip
          v-if="mod.dependencyIssue"
          color="warning"
          prepend-icon="mdi-link-variant"
          size="x-small"
          variant="flat"
        >
          依赖异常
        </v-chip>

        <v-chip
          v-if="mod.conflictIssue"
          color="error"
          prepend-icon="mdi-alert-octagon-outline"
          size="x-small"
          variant="flat"
        >
          模组冲突
        </v-chip>

        <v-chip
          v-if="mod.hasUpdate"
          color="primary"
          size="x-small"
          variant="flat"
        >
          新版本 {{ mod.updateInfo?.version }}
        </v-chip>
      </div>
    </v-card-text>

    <v-divider />

    <v-card-actions class="px-3 py-2">
      <v-btn
        v-if="mod.canConfig"
        prepend-icon="mdi-cog-outline"
        variant="tonal"
        @click="emit('config', mod.order)"
      >
        配置
      </v-btn>

      <v-btn
        v-if="mod.hasUpdate"
        color="primary"
        prepend-icon="mdi-refresh"
        variant="flat"
        @click="emit('update', mod.order)"
      >
        更新
      </v-btn>

      <v-spacer />

      <v-btn
        icon="mdi-pencil-outline"
        variant="text"
        @click="emit('rename', mod.order)"
      />

      <v-btn
        color="error"
        icon="mdi-delete-outline"
        variant="text"
        @click="emit('uninstall', mod.order)"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
  import type { ModInfo } from '@/types/mod'
  import { computed } from 'vue'

  const props = defineProps({
    mod: {
      type: Object as () => ModInfo,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  })

  const emit = defineEmits<{
    toggle: [order: number]
    config: [order: number]
    update: [order: number]
    rename: [order: number]
    uninstall: [order: number]
  }>()

  // 优先显示 modloader.mod.json 中的名称, 否则使用去除 .asar 后缀的文件名.
  const displayName = computed(() => props.mod.name || props.mod.file.replace(/\.asar$/i, ''))
</script>

<style scoped>
.mod-card {
  transition: box-shadow 0.2s ease;
}

.mod-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mod-card__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: 12px;
}

.mod-card__name {
  min-width: 0;
}

.mod-card__priority {
  grid-column: 2;
}

.mod-card__switch {
  grid-column: 3;
}

.mod-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
}
</style>
