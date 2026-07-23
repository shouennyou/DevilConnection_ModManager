<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="760"
    persistent
    scrollable
    width="calc(100vw - 32px)"
  >
    <v-card>
      <v-card-title class="text-h6 font-weight-bold d-flex align-center">
        <v-icon class="mr-2" :color="issueMeta.color" :icon="issueMeta.icon" />
        {{ title }}
      </v-card-title>

      <v-card-text class="mod-issue-dialog__content">
        <p v-if="description" class="text-body-1 mb-4">
          {{ description }}
        </p>

        <div v-if="groups.length > 0" class="mod-issue-dialog__groups">
          <section
            v-for="group in groups"
            :key="group.title"
            class="mod-issue-dialog__group"
          >
            <div class="font-weight-medium mb-2">
              {{ group.title }}
            </div>

            <v-list class="py-0" density="compact">
              <v-list-item
                v-for="item in group.items"
                :key="item"
                class="px-0"
                :title="item"
              >
                <template #prepend>
                  <v-icon icon="mdi-circle-small" size="20" />
                </template>
              </v-list-item>
            </v-list>
          </section>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn color="primary" variant="flat" @click="handleConfirm">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { ModIssueDialogOptions, ModIssueGroup, ModIssueKind } from './mod-issue-dialog'
  import { computed, ref } from 'vue'

  const ISSUE_META: Record<ModIssueKind, { icon: string, color: string, title: string }> = {
    duplicate: {
      icon: 'mdi-content-duplicate',
      color: 'warning',
      title: '检测到重复模组',
    },
    conflict: {
      icon: 'mdi-alert-circle-outline',
      color: 'error',
      title: '检测到模组冲突',
    },
    dependency: {
      icon: 'mdi-link-variant',
      color: 'warning',
      title: '检测到模组依赖问题',
    },
  }

  const dialogVisible = ref(false)
  const kind = ref<ModIssueKind>('duplicate')
  const title = ref(ISSUE_META.duplicate.title)
  const description = ref('')
  const groups = ref<ModIssueGroup[]>([])
  const confirmText = ref('知道了')

  const issueMeta = computed(() => ISSUE_META[kind.value])

  let resolvePromise: (() => void) | null = null

  function open (options: ModIssueDialogOptions = {}): Promise<void> {
    kind.value = options.kind ?? 'duplicate'
    title.value = options.title ?? ISSUE_META[kind.value].title
    description.value = options.description ?? ''
    groups.value = options.groups ?? []
    confirmText.value = options.confirmText ?? '知道了'
    dialogVisible.value = true

    return new Promise(resolve => {
      resolvePromise = resolve
    })
  }

  function handleConfirm () {
    dialogVisible.value = false
    resolvePromise?.()
    resolvePromise = null
  }

  defineExpose({ open })
</script>

<style scoped>
.mod-issue-dialog__content {
  max-height: min(60vh, 560px);
}

.mod-issue-dialog__groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mod-issue-dialog__group {
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
}
</style>
