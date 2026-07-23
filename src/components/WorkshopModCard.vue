<template>
  <v-card class="workshop-mod-card" @click="openRepository">
    <v-card-text class="pa-4">
      <div class="workshop-mod-header mb-2">
        <span class="workshop-mod-title text-subtitle-1 font-weight-bold text-truncate">
          <template v-for="(part, index) in highlightParts(displayName)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <div class="workshop-mod-statuses">
          <v-chip
            v-if="mod.installed"
            color="success"
            prepend-icon="mdi-check-circle-outline"
            size="x-small"
            variant="tonal"
          >
            已安装
          </v-chip>

          <v-chip
            v-if="mod.hasUpdate"
            color="primary"
            size="x-small"
            variant="flat"
          >
            新版本
            <template v-for="(part, index) in highlightParts(mod.version)" :key="index">
              <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </v-chip>
        </div>
      </div>

      <div class="text-caption text-medium-emphasis mb-2">
        <span v-if="mod.version">
          <template v-for="(part, index) in highlightParts(mod.version)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <span v-if="displayAuthors">
          ·
          <template v-for="(part, index) in highlightParts(displayAuthors)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <span>
          ·
          <template v-for="(part, index) in highlightParts(mod.id)" :key="index">
            <mark v-if="part.matched" class="search-highlight">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>

        <span v-if="mod.installed"> · 已安装 {{ mod.installed.version || '未知版本' }}</span>
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
    </v-card-text>

    <v-divider />

    <v-card-actions class="px-3 py-2">
      <v-btn
        v-if="!mod.installed"
        color="primary"
        :disabled="!mod.asarUrl"
        :loading="downloading"
        prepend-icon="mdi-download"
        variant="flat"
        @click.stop="emit('download', mod)"
      >
        下载
      </v-btn>

      <v-btn
        v-else-if="mod.hasUpdate"
        color="primary"
        :disabled="!mod.asarUrl"
        :loading="downloading"
        prepend-icon="mdi-refresh"
        variant="flat"
        @click.stop="emit('download', mod)"
      >
        更新
      </v-btn>

      <v-chip
        v-else
        color="success"
        prepend-icon="mdi-check"
        size="small"
        variant="tonal"
      >
        已安装
      </v-chip>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
  import type { WorkshopModInfo } from '@/types/mod'
  import { computed } from 'vue'
  import { githubUrl } from '@/config/repos'

  const props = defineProps<{
    mod: WorkshopModInfo
    downloading: boolean
    searchTerms: string[]
  }>()

  const emit = defineEmits<{
    download: [mod: WorkshopModInfo]
  }>()

  const displayName = computed(() => props.mod.name || props.mod.id)
  const displayAuthors = computed(() => props.mod.author.join(', '))

  function openRepository () {
    if (!props.mod.repo) return

    const url = githubUrl(props.mod.repo)
    if (window.api?.openWebPage) {
      window.api.openWebPage(url)
    } else {
      window.open(url, '_blank')
    }
  }

  interface HighlightPart {
    text: string
    matched: boolean
  }

  function normalizeCharacter (char: string): string {
    return char.normalize('NFKC').toLocaleLowerCase()
  }

  function matchStart (characters: string[], term: string[]): number {
    if (term.length === 0 || term.length > characters.length) return -1
    for (let start = 0; start <= characters.length - term.length; start++) {
      if (term.every((char, index) => characters[start + index] === char)) {
        return start
      }
    }
    return -1
  }

  function fuzzyMatchIndexes (characters: string[], term: string[]): number[] {
    const indexes: number[] = []
    let offset = 0
    for (const char of term) {
      const found = characters.indexOf(char, offset)
      if (found === -1) return []
      indexes.push(found)
      offset = found + 1
    }
    return indexes
  }

  /** 将连续或模糊匹配的字符拆分为安全的高亮渲染片段. */
  function highlightParts (value: string): HighlightPart[] {
    if (!value || props.searchTerms.length === 0) {
      return [{ text: value, matched: false }]
    }

    const characters = Array.from(value)
    const normalized = characters.map(char => normalizeCharacter(char))
    const matched = new Set<number>()
    for (const searchTerm of props.searchTerms) {
      const term = Array.from(searchTerm).map(char => normalizeCharacter(char))
      const start = matchStart(normalized, term)
      const indexes = start === -1
        ? fuzzyMatchIndexes(normalized, term)
        : term.map((_, index) => start + index)
      for (const index of indexes) matched.add(index)
    }

    const parts: HighlightPart[] = []
    for (const [index, character] of characters.entries()) {
      const isMatched = matched.has(index)
      const last = parts.at(-1)
      if (last && last.matched === isMatched) {
        last.text += character
      } else {
        parts.push({ text: character, matched: isMatched })
      }
    }
    return parts
  }
</script>

<style scoped>
  .workshop-mod-card {
    cursor: pointer;
    transition: box-shadow 0.2s ease;
  }

  .workshop-mod-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .workshop-mod-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .workshop-mod-title {
    flex: 1 1 180px;
    min-width: 0;
  }

  .workshop-mod-statuses {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .search-highlight {
    padding: 0 1px;
    border-radius: 2px;
    color: inherit;
    background: rgba(255, 235, 59, 0.5);
  }
</style>
