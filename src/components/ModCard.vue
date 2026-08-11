<template>
  <v-card
    class="mod-card"
    :class="{ 'mod-card--with-icon': Boolean(iconUrl) }"
    :style="cardStyle"
  >
    <v-card-text class="pa-4">
      <div class="mod-card__header mb-2">
        <span class="mod-card__name text-subtitle-1 font-weight-bold text-truncate">
          <template v-for="(part, index) in highlightParts(displayName)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
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
        <span v-if="mod.version">
          <template v-for="(part, index) in highlightParts(mod.version)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <span v-if="mod.author?.length">
          ·
          <template v-for="(part, index) in highlightParts(mod.author.join(', '))" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <span v-if="mod.id">
          ·
          <template v-for="(part, index) in highlightParts(mod.id)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <span v-if="mod.sizeText"> · {{ mod.sizeText }}</span>
      </div>

      <p
        v-if="mod.description"
        class="multiline-text text-body-2 text-medium-emphasis mb-0"
      >
        <template v-for="(part, index) in highlightParts(mod.description)" :key="index">
          <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
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
  import { computed, onBeforeUnmount, type PropType, ref, watch } from 'vue'
  import { Search } from '@/utils/Search'

  const ICON_MIME_TYPES: Record<string, string> = {
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }

  const props = defineProps({
    mod: {
      type: Object as () => ModInfo,
      required: true,
    },
    searchTerms: {
      type: Array as PropType<string[]>,
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
  const iconUrl = ref('')
  const cardStyle = computed((): Record<string, string> => {
    if (!iconUrl.value) return {}
    return { '--mod-card-icon': `url("${iconUrl.value}")` }
  })
  let loadId = 0

  function highlightParts (value: string) {
    return Search.highlight(value, props.searchTerms)
  }

  function resolveIconPath (value: string | undefined): { path: string, mimeType: string } | null {
    const rawPath = typeof value === 'string' ? value.trim() : ''
    if (!rawPath || rawPath.length > 256 || rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-z]:/i.test(rawPath)) {
      return null
    }

    const segments = rawPath.replaceAll('\\', '/').split('/')
    if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
      return null
    }

    const path = segments.join('/')
    const extension = path.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = ICON_MIME_TYPES[extension]
    return mimeType ? { path, mimeType } : null
  }

  function revokeIconUrl () {
    if (!iconUrl.value) return
    URL.revokeObjectURL(iconUrl.value)
    iconUrl.value = ''
  }

  async function loadIcon () {
    const currentLoadId = ++loadId
    revokeIconUrl()

    const icon = resolveIconPath(props.mod.icon)
    const api = window.api?.modloader
    if (!icon || !api || typeof URL.createObjectURL !== 'function') return

    try {
      const data = await api.readBuffer(`mods/${props.mod.file}/${icon.path}`)
      if (!data || currentLoadId !== loadId) return

      const buffer = new ArrayBuffer(data.byteLength)
      new Uint8Array(buffer).set(data)
      const url = URL.createObjectURL(new Blob([buffer], { type: icon.mimeType }))
      if (currentLoadId !== loadId) {
        URL.revokeObjectURL(url)
        return
      }
      iconUrl.value = url
    } catch (error) {
      console.warn(`[模组管理] 读取模组图标失败, 文件: ${props.mod.file}`, error)
    }
  }

  watch(
    () => [props.mod.file, props.mod.icon],
    function () {
      void loadIcon()
    },
    { immediate: true },
  )

  onBeforeUnmount(function () {
    loadId += 1
    revokeIconUrl()
  })
</script>

<style scoped>
.mod-card {
  transition: box-shadow 0.2s ease;
}

.mod-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mod-card--with-icon {
  background-color: rgb(var(--v-theme-surface));
  background-image: linear-gradient(
    110deg,
    rgba(var(--v-theme-surface), 0.97) 0%,
    rgba(var(--v-theme-surface), 0.91) 54%,
    rgba(var(--v-theme-surface), 0.8) 100%
  ), var(--mod-card-icon);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
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

.search-highlight {
  padding: 0 1px;
  border-radius: 2px;
  color: inherit;
  background: rgba(255, 235, 59, 0.5);
}

@media (max-width: 600px) {
  .mod-card__header {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 4px;
    column-gap: 8px;
  }

  .mod-card__priority {
    grid-row: 2;
    grid-column: 1;
    justify-self: start;
  }

  .mod-card__switch {
    grid-row: 1 / span 2;
    grid-column: 2;
  }
}

</style>
