<template>
  <v-dialog v-model="dialogVisible" max-width="560" persistent scrollable>
    <v-card>
      <v-card-title class="text-h6 font-weight-bold d-flex align-center">
        <v-icon class="mr-2" icon="mdi-refresh" />
        发现新版本
      </v-card-title>

      <v-card-subtitle v-if="version" class="pb-1">
        {{ name }} · {{ version }}
      </v-card-subtitle>

      <v-card-text style="max-height: 420px;">
        <div v-if="loading" class="d-flex justify-center py-6">
          <v-progress-circular color="primary" indeterminate size="28" />
        </div>

        <div
          v-else-if="renderedHtml"
          class="changelog-md text-body-2"
          v-html="renderedHtml"
        />

        <a
          v-else-if="externalLink"
          class="text-primary"
          href="#"
          @click.prevent="openExternal"
        >
          {{ externalLink }}
        </a>

        <p
          v-else
          class="text-body-2 text-medium-emphasis mb-0"
          style="white-space: pre-line"
        >
          {{ plainText || '无更新说明' }}
        </p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn variant="text" @click="handleCancel">
          取消
        </v-btn>

        <v-btn
          :color="showDownload ? undefined : 'primary'"
          :disabled="!url"
          :variant="showDownload ? 'text' : 'flat'"
          @click="handleJump"
        >
          跳转下载
        </v-btn>

        <v-btn
          v-if="showDownload"
          color="primary"
          variant="flat"
          @click="handleDownload"
        >
          下载
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { UpdateAction, UpdateDialogOptions } from './update-dialog'
  import { ref } from 'vue'
  import { renderMarkdown } from '@/utils/markdown'

  const dialogVisible = ref(false)
  const name = ref('')
  const version = ref('')
  const url = ref('')
  const showDownload = ref(false)

  const loading = ref(false)
  const renderedHtml = ref('')
  const plainText = ref('')
  const externalLink = ref('')

  let resolvePromise: ((value: UpdateAction) => void) | null = null

  function isUrl (s: string): boolean {
    return /^https?:\/\//i.test(s)
  }

  async function resolveChangelog (changelog: string): Promise<void> {
    renderedHtml.value = ''
    plainText.value = ''
    externalLink.value = ''

    const cl = (changelog || '').trim()
    if (!cl) return

    // 非链接内容直接按 Markdown 渲染.
    if (!isUrl(cl)) {
      renderedHtml.value = renderMarkdown(cl)
      return
    }

    // 链接内容先请求文本, 再按 Markdown 渲染.
    loading.value = true
    try {
      const text = await fetchUrlText(cl)
      renderedHtml.value = renderMarkdown(text)
    } catch (error) {
      console.error('[更新对话框] 获取更新日志失败:', error)
      // 请求失败时保留外部链接供用户打开.
      externalLink.value = cl
    } finally {
      loading.value = false
    }
  }

  /** 优先通过主进程请求, 不可用时降级为浏览器 fetch. */
  async function fetchUrlText (url: string): Promise<string> {
    const api = window.api?.modmanager
    if (api?.fetchText) {
      const res = await api.fetchText(url)
      if (!res.success || res.text == null) throw new Error(res.message || '请求失败')
      return res.text
    }
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.text()
  }

  function open (options: UpdateDialogOptions): Promise<UpdateAction> {
    name.value = options.name ?? ''
    version.value = options.version ?? ''
    url.value = options.url ?? ''
    showDownload.value = options.showDownload ?? false
    dialogVisible.value = true

    // 异步解析更新日志, 不阻塞弹窗显示.
    resolveChangelog(options.changelog ?? '')

    return new Promise(resolve => {
      resolvePromise = resolve
    })
  }

  function jump (target: string) {
    if (!target) return
    if (window.api?.openWebPage) {
      window.api.openWebPage(target)
    } else {
      window.open(target, '_blank')
    }
  }

  function openExternal () {
    jump(externalLink.value)
  }

  function handleJump () {
    jump(url.value)
    dialogVisible.value = false
    resolvePromise?.('jump')
    resolvePromise = null
  }

  function handleDownload () {
    dialogVisible.value = false
    resolvePromise?.('download')
    resolvePromise = null
  }

  function handleCancel () {
    dialogVisible.value = false
    resolvePromise?.('cancel')
    resolvePromise = null
  }

  defineExpose({ open })
</script>

<style scoped>
.changelog-md :deep(h1),
.changelog-md :deep(h2),
.changelog-md :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.6em 0 0.3em;
}

.changelog-md :deep(p) {
  margin: 0.4em 0;
}

.changelog-md :deep(ul),
.changelog-md :deep(ol) {
  padding-left: 1.4em;
  margin: 0.4em 0;
}

.changelog-md :deep(a) {
  color: rgb(var(--v-theme-primary));
}

.changelog-md :deep(code) {
  font-family: ui-monospace, monospace;
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
</style>
