<template>
  <div class="mods-page">
    <v-container class="pa-4" fluid>
      <div ref="listEl" class="mod-list">
        <!-- 使用位置索引作为 key, 使 SortableJS 与 Vue 按同一位置顺序更新. -->
        <div
          v-for="(mod, index) in mods"
          :key="index"
          class="mod-list-item"
        >
          <ModCard
            :index="index"
            :mod="mod"
            @config="handleConfig"
            @rename="handleRename"
            @toggle="handleToggle"
            @uninstall="handleUninstall"
            @update="handleUpdate"
          />
        </div>
      </div>
    </v-container>

    <input
      ref="fileInputEl"
      accept=".asar"
      class="d-none"
      type="file"
      @change="onFileSelected"
    >

    <ModConfigDialog ref="configDialogRef" />
  </div>
</template>

<script setup lang="ts">
  import type {
    ModConfigDefinition,
    ModConfigField,
    ModConfigFieldType,
    ModConfigOption,
    ModConfigValue,
    ModInfo,
    ModUpdateInfo,
  } from '@/types/mod'
  import type { FsResult, ModMeta, ModOrderEntry } from '@/types/window-api'
  import semver from 'semver'
  import Sortable from 'sortablejs'
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import ModConfigDialog from '@/components/dialogs/ModConfigDialog.vue'
  import ModCard from '@/components/ModCard.vue'
  import { useDialogs } from '@/composables/useDialogs'
  import { useModActions } from '@/composables/useModActions'
  import { useModDownload } from '@/composables/useModDownload'
  import { useProgressStore } from '@/stores/progress'
  import { inspectModIssues } from '@/utils/mod-issues'
  import { MOD_ORDER_PATH } from '@/utils/mod-order'
  import { ModUpdateSource } from '@/utils/ModUpdateSource'

  const dialogs = useDialogs()
  const progress = useProgressStore()
  const { installSignal } = useModActions()
  const { updateMod } = useModDownload()

  const listEl = ref<HTMLElement | null>(null)
  const fileInputEl = ref<HTMLInputElement | null>(null)
  const configDialogRef = ref<InstanceType<typeof ModConfigDialog> | null>(null)
  const isDragging = ref(false)
  let sortable: Sortable | null = null

  const mods = ref<ModInfo[]>([])

  /** 游戏核心归档不作为模组展示. */
  const SYSTEM_FILES = new Set(['app.asar', 'app.bak.asar'])
  const CONFIG_FIELD_TYPES = new Set<ModConfigFieldType>(['text', 'password', 'toggle', 'number', 'select'])
  const UNSAFE_CONFIG_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

  /** 模组仅允许作为 mods 根目录中的单层条目. */
  function isModEntryName (name: string): boolean {
    return name.length > 0
      && name !== '.'
      && name !== '..'
      && !name.includes('/')
      && !name.includes('\\')
  }

  /** 将字节数格式化为可读字符串. */
  function formatSize (bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  function isRecord (value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  function isConfigValue (value: unknown): value is ModConfigValue {
    return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
  }

  function defaultConfigValue (type: ModConfigFieldType): ModConfigValue {
    if (type === 'toggle') return false
    if (type === 'number') return 0
    return ''
  }

  function normalizeDefaultValue (type: ModConfigFieldType, value: unknown): ModConfigValue {
    if (type === 'toggle') return typeof value === 'boolean' ? value : false
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : 0
    if (type === 'select') return isConfigValue(value) ? value : ''
    return typeof value === 'string' ? value : defaultConfigValue(type)
  }

  function parseSelectOptions (value: unknown, fieldKey: string): ModConfigOption[] {
    if (!Array.isArray(value)) {
      throw new TypeError(`配置项 ${fieldKey} 缺少 options 数组`)
    }
    return value.map((option, index) => {
      if (!isRecord(option) || !isConfigValue(option.value) || typeof option.label !== 'string') {
        throw new Error(`配置项 ${fieldKey} 的第 ${index + 1} 个选项无效`)
      }
      return { value: option.value, label: option.label }
    })
  }

  function parseConfigDefinition (content: string, fallbackTitle: string): ModConfigDefinition {
    const payload: unknown = JSON.parse(content)
    if (!isRecord(payload) || !Array.isArray(payload.fields)) {
      throw new Error('modloader.config.json 必须包含 fields 数组')
    }

    const keys = new Set<string>()
    const fields = payload.fields.map((item, index): ModConfigField => {
      if (!isRecord(item) || typeof item.key !== 'string' || typeof item.type !== 'string') {
        throw new Error(`第 ${index + 1} 个配置项格式无效`)
      }
      const key = item.key.trim()
      if (!key || UNSAFE_CONFIG_KEYS.has(key) || keys.has(key)) {
        throw new Error(`第 ${index + 1} 个配置项 key 无效或重复`)
      }
      if (!CONFIG_FIELD_TYPES.has(item.type as ModConfigFieldType)) {
        throw new Error(`配置项 ${key} 的 type 无效`)
      }
      keys.add(key)

      const type = item.type as ModConfigFieldType
      return {
        key,
        type,
        label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : key,
        default: normalizeDefaultValue(type, item.default),
        placeholder: typeof item.placeholder === 'string' ? item.placeholder : undefined,
        help: typeof item.help === 'string' ? item.help : undefined,
        required: item.required === true,
        options: type === 'select' ? parseSelectOptions(item.options, key) : undefined,
      }
    })

    return {
      title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : fallbackTitle,
      description: typeof payload.description === 'string' ? payload.description : '',
      fields,
    }
  }

  function parseSavedConfig (content: string): Record<string, ModConfigValue> {
    const payload: unknown = JSON.parse(content)
    if (!isRecord(payload)) {
      throw new Error('已保存的配置必须是对象')
    }
    const values: Record<string, ModConfigValue> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (!UNSAFE_CONFIG_KEYS.has(key) && isConfigValue(value)) {
        values[key] = value
      }
    }
    return values
  }

  function configDefinitionPath (mod: ModInfo): string {
    return `mods/${mod.file}/modloader.config.json`
  }

  function configStoragePath (mod: ModInfo): string | null {
    if (!mod.id || mod.id.includes('/') || mod.id.includes('\\') || mod.id === '.' || mod.id === '..') {
      return null
    }
    return `config/${mod.id}.json`
  }

  /**
   * 合并 mod_order.json 与 scanModInfos 元数据, 并异步补充模组大小.
   */
  async function loadMods () {
    const api = window.api?.modmanager
    const fileApi = window.api?.modloader
    if (!api || !fileApi) {
      console.warn('[模组管理] 文件接口不可用, 可能不在 Electron 环境中')
      return
    }

    let orderList: ModOrderEntry[] = []
    let modInfos: ModMeta[] = []
    try {
      const [content, infos] = await Promise.all([
        api.readFile(MOD_ORDER_PATH),
        api.scanModInfos(),
      ])
      orderList = content ? JSON.parse(content) : []
      modInfos = infos ?? []
    } catch (error) {
      console.error('[模组管理] 加载模组列表失败:', error)
      return
    }

    const infoMap = new Map(modInfos.map(info => [info.file, info]))

    const entries = orderList
      .filter(e => e && e.file && !SYSTEM_FILES.has(e.file))
      .toSorted((a, b) => (a.order ?? 9999) - (b.order ?? 9999))

    const list: ModInfo[] = []
    for (const entry of entries) {
      let sizeText = ''
      try {
        const bytes = await fileApi.getSize(`mods/${entry.file}`)
        if (bytes != null && bytes > 0) sizeText = formatSize(bytes)
      } catch (error) {
        console.error(`[模组管理] 读取模组大小失败, 文件: ${entry.file}`, error)
        // 单个模组大小读取失败不影响列表加载.
      }

      const info = infoMap.get(entry.file)
      list.push({
        file: entry.file,
        order: entry.order,
        enabled: entry.enabled !== false,
        sizeText,
        id: info?.id || '',
        name: info?.name || '',
        version: info?.version || '',
        author: info?.author || [],
        description: info?.description || '',
        update: info?.update || null,
        depends: info?.depends || {},
        breaks: info?.breaks || {},
        injections: info?.injections || [],
        canConfig: info?.canConfig === true,
      })
    }

    mods.value = list
    // 标记并提示重复, 依赖和冲突问题.
    checkModIssues(list)
    // 列表优先渲染, 更新检查在后台进行.
    checkAllUpdates()
  }

  // 记录已提示的问题快照, 避免列表刷新时重复弹窗.
  let lastIssueSig = ''

  /** 检测模组问题, 并在问题集合变化时提示一次. */
  function checkModIssues (list: ModInfo[]) {
    const result = inspectModIssues(list)
    for (const m of list) {
      m.duplicate = Boolean(m.id) && result.duplicateIds.has(m.id as string)
      m.dependencyIssue = result.dependencyFiles.has(m.file)
      m.conflictIssue = result.conflictFiles.has(m.file)
    }

    if (result.dialogs.length === 0) {
      lastIssueSig = ''
      return
    }

    const sig = JSON.stringify(result.dialogs)
    if (sig !== lastIssueSig) {
      lastIssueSig = sig
      void showModIssues(result.dialogs)
    }
  }

  /** 按问题类型依次展示弹窗, 避免多个弹窗同时打开. */
  async function showModIssues (issues: ReturnType<typeof inspectModIssues>['dialogs']): Promise<void> {
    for (const issue of issues) {
      await dialogs.showModIssue(issue)
    }
  }

  /**
   * 检查单个模组是否有更新, 失败时下次列表加载会重新检查.
   * remote 和 github 源均解析 update.json 并用 semver 比较 version.
   */
  async function checkUpdate (mod: ModInfo): Promise<boolean> {
    const update = mod.update
    if (!update) return false
    try {
      const api = window.api?.modmanager
      if (!api) {
        return false
      }

      const remote = await ModUpdateSource.fetch(api, update, mod.id)
      if (!remote) {
        return false
      }
      const localVersion = mod.version || '0.0.0'
      if (semver.valid(remote.version) && semver.valid(localVersion) && semver.gt(remote.version, localVersion)) {
        mod.hasUpdate = true
        mod.updateInfo = {
          version: remote.version,
          asarUrl: remote.asarUrl,
          changelog: remote.changelog,
        }
      } else {
        mod.hasUpdate = false
        mod.updateInfo = null
      }
      return true
    } catch (error) {
      console.warn(`[模组管理] 检查模组更新失败, 文件: ${mod.file}`, error)
      return false
    }
  }

  interface ModUpdateResult {
    hasUpdate: boolean
    info: ModUpdateInfo | null
  }

  /** remote 源使用 url, github 源使用 repo 作为更新源标识. */
  function updateSrcKey (update: NonNullable<ModInfo['update']>): string {
    return (update.source === 'github' ? update.repo : update.url) ?? ''
  }

  /** 同一模组版本和更新源在本轮检查中只请求一次. */
  function modUpdateKey (mod: ModInfo): string {
    const update = mod.update!
    return `${mod.id || mod.file}::${update.source}::${updateSrcKey(update)}::${mod.version || '0.0.0'}`
  }

  /**
   * 并发检查所有模组的更新, 在本轮内复用相同版本和更新源的请求.
   */
  async function checkAllUpdates () {
    const inflight = new Map<string, Promise<ModUpdateResult>>()

    await Promise.all(mods.value.map(async mod => {
      if (!mod.update) {
        mod.hasUpdate = false
        mod.updateInfo = null
        return
      }
      const key = modUpdateKey(mod)
      let request = inflight.get(key)
      if (!request) {
        request = (async (): Promise<ModUpdateResult> => {
          const ok = await checkUpdate(mod)
          return {
            hasUpdate: ok && mod.hasUpdate === true,
            info: ok ? mod.updateInfo ?? null : null,
          }
        })()
        inflight.set(key, request)
      }

      const result = await request
      mod.hasUpdate = result.hasUpdate
      mod.updateInfo = result.info
    }))
  }

  onMounted(() => {
    loadMods()

    if (!listEl.value) return
    sortable = Sortable.create(listEl.value, {
      animation: 200,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      handle: '.mod-list-item',
      filter: '.v-switch, .v-card-actions .v-btn',
      onStart () {
        isDragging.value = true
      },
      onEnd (evt) {
        isDragging.value = false

        const oldIndex = evt.oldIndex
        const newIndex = evt.newIndex
        if (oldIndex == null || newIndex == null || oldIndex === newIndex) return

        // 先恢复 SortableJS 修改的 DOM, 再由 Vue 根据新数组统一渲染.
        revertSortableDom(evt.item, evt.from, oldIndex)

        // 按拖拽位置重排数组, 不依赖可能重复或可变的业务字段.
        const next = mods.value.slice()
        const [moved] = next.splice(oldIndex, 1)
        next.splice(newIndex, 0, moved)
        for (const [i, m] of next.entries()) {
          m.order = i + 1
        }
        mods.value = next

        persistOrder()
      },
    })
  })

  onBeforeUnmount(() => {
    sortable?.destroy()
    sortable = null
  })

  watch(installSignal, () => handleInstall())

  /** 恢复 SortableJS 改动的 DOM, 避免 Vue 更新时出现索引偏移. */
  function revertSortableDom (item: HTMLElement, parent: HTMLElement, originalIndex: number) {
    item.remove()
    const refNode = originalIndex >= parent.children.length
      ? null
      : parent.children[originalIndex]
    if (refNode) {
      refNode.before(item)
    } else {
      parent.append(item)
    }
  }

  /** 将模组顺序和启用状态写回 mod_order.json. */
  async function persistOrder () {
    const api = window.api?.modmanager
    if (!api) return
    const entries = mods.value.map(m => ({
      file: m.file,
      order: m.order,
      enabled: m.enabled,
    }))
    try {
      await api.setModOrder(entries)
    } catch (error) {
      console.error('[模组管理] 写入模组排序配置失败:', error)
    }
  }

  function handleToggle (order: number) {
    const mod = mods.value.find(m => m.order === order)
    if (!mod) return
    mod.enabled = !mod.enabled
    checkModIssues(mods.value)
    persistOrder()
  }

  async function handleConfig (order: number) {
    const api = window.api?.modmanager
    const fileApi = window.api?.modloader
    const mod = mods.value.find(item => item.order === order)
    if (!api || !fileApi || !mod) return

    const storagePath = configStoragePath(mod)
    if (!storagePath) {
      await dialogs.alert({ title: '无法配置', message: '模组 id 无效, 无法确定配置文件路径。' })
      return
    }

    let definition: ModConfigDefinition
    try {
      const content = await api.readFile(configDefinitionPath(mod))
      if (!content) {
        await dialogs.alert({ title: '无法配置', message: '未找到 modloader.config.json。' })
        return
      }
      definition = parseConfigDefinition(content, mod.name || mod.file)
    } catch (error) {
      console.error(`[模组管理] 读取模组配置定义失败, 文件: ${mod.file}`, error)
      await dialogs.alert({
        title: '无法配置',
        message: error instanceof Error ? error.message : '读取模组配置定义失败。',
      })
      return
    }

    let savedValues: Record<string, ModConfigValue> = {}
    try {
      const content = await api.readFile(storagePath)
      if (content) savedValues = parseSavedConfig(content)
    } catch (error) {
      console.error(`[模组管理] 读取已保存配置失败, 模组: ${mod.id}`, error)
      await dialogs.alert({ title: '已保存配置无效', message: '将使用 modloader.config.json 中的默认值。' })
    }

    const values = await configDialogRef.value?.open(definition, savedValues) ?? null
    if (values === null) return

    const result = await fileApi.writeFile(storagePath, `${JSON.stringify(values, null, 2)}\n`)
    if (!result.success) {
      await dialogs.alert({ title: '保存配置失败', message: result.error || '无法写入配置文件。' })
    }
  }

  async function handleUpdate (order: number) {
    const mod = mods.value.find(m => m.order === order)
    if (!mod?.updateInfo) return

    const { version, asarUrl, changelog } = mod.updateInfo
    const displayName = mod.name || mod.file.replace(/\.asar$/i, '')

    const action = await dialogs.showUpdate({
      name: displayName,
      version,
      changelog,
      url: asarUrl,
      showDownload: true,
    })

    if (action !== 'download') return

    if (!asarUrl) {
      await dialogs.alert({ title: '无法下载', message: '该更新未提供下载地址。' })
      return
    }

    const result = await updateMod({ fileName: mod.file, displayName, asarUrl })
    if (result.success) {
      await loadMods()
      setTimeout(() => progress.remove(mod.file), 3000)
    }
  }

  async function handleRename (order: number) {
    const fileApi = window.api?.modloader
    const mod = mods.value.find(m => m.order === order)
    if (!fileApi || !mod) return

    const isAsar = /\.asar$/i.test(mod.file)
    const currentName = mod.file.replace(/\.asar$/i, '')
    const input = await dialogs.rename({
      title: '重命名模组',
      label: '名称',
      initialValue: currentName,
    })
    if (input == null) return
    const trimmed = input.trim()
    if (!trimmed) return

    // asar 模组重命名时自动保留 .asar 后缀.
    const finalName = isAsar && !/\.asar$/i.test(trimmed) ? `${trimmed}.asar` : trimmed
    if (finalName === mod.file) return
    if (!isModEntryName(finalName)) {
      await dialogs.alert({ title: '重命名失败', message: '模组名称不能包含路径分隔符。' })
      return
    }

    const result = await fileApi.rename(`mods/${mod.file}`, `mods/${finalName}`)
    if (result.success) {
      mod.file = finalName
      await persistOrder()
      await loadMods()
    } else {
      await dialogs.alert({ title: '重命名失败', message: result.error || '未知错误' })
    }
  }

  async function handleUninstall (order: number) {
    const fileApi = window.api?.modloader
    const mod = mods.value.find(m => m.order === order)
    if (!fileApi || !mod) return

    const name = mod.name || mod.file.replace(/\.asar$/i, '')
    const ok = await dialogs.confirm({
      title: '卸载模组',
      message: `确定要卸载「${name}」吗?模组文件将被删除,此操作不可撤销。`,
      confirmText: '卸载',
      cancelText: '取消',
      confirmColor: 'error',
    })
    if (!ok) return

    const targetPath = `mods/${mod.file}`
    const stat = await fileApi.stat(targetPath)
    const result = stat?.isDirectory()
      ? await fileApi.rmdir(targetPath)
      : await fileApi.unlink(targetPath)
    if (result.success) {
      const idx = mods.value.findIndex(m => m.file === mod.file)
      if (idx !== -1) {
        mods.value.splice(idx, 1)
        for (const [i, m] of mods.value.entries()) m.order = i + 1
      }
      await persistOrder()
      checkModIssues(mods.value)
    } else {
      await dialogs.alert({ title: '卸载失败', message: result.error || '删除模组文件失败。' })
    }
  }

  function handleInstall () {
    fileInputEl.value?.click()
  }

  /** 以流式临时文件写入选中的 asar, 重名时先确认覆盖. */
  async function onFileSelected (event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    // 重置选择状态, 允许再次选择同一文件.
    input.value = ''
    if (!file) return

    const api = window.api?.modmanager
    const fileApi = window.api?.modloader
    if (!api || !fileApi) return

    // 禁止操作游戏核心归档, 避免破坏游戏资源.
    if (SYSTEM_FILES.has(file.name)) {
      await dialogs.alert({
        title: '文件受限',
        message: '为了保证程序的稳定性,禁止对核心文件 (app.asar / app.bak.asar) 进行操作。',
      })
      return
    }

    const exists = mods.value.some(m => m.file === file.name)
    if (exists) {
      const ok = await dialogs.confirm({
        title: '文件已存在',
        message: `「${file.name}」已存在,是否覆盖?`,
        confirmText: '覆盖',
        cancelText: '取消',
        confirmColor: 'error',
      })
      if (!ok) return
    }

    const targetPath = `mods/${file.name}`
    const displayName = file.name.replace(/\.asar$/i, '')
    progress.start(file.name, { title: '上传模组', label: displayName })

    try {
      const result = await uploadFileStream(fileApi, targetPath, file, p => progress.update(file.name, p))
      if (!result.success) {
        progress.finish(file.name, 'error', result.error || '写入文件失败')
        return
      }
      progress.finish(file.name, 'success')
      // 新增模组需登记到 mod_order.json, 覆盖已有文件时顺序不变.
      if (!exists) {
        const entries = mods.value.map(m => ({ file: m.file, order: m.order, enabled: m.enabled }))
        entries.push({ file: file.name, order: entries.length + 1, enabled: true })
        await api.setModOrder(entries)
      }
      await loadMods()
      setTimeout(() => progress.remove(file.name), 3000)
    } catch (error) {
      console.error('[模组管理] 安装模组失败:', error)
      progress.finish(file.name, 'error', '读取或写入文件时出错')
    }
  }

  /**
   * 将 File 原生流写入 modloader 流会话.
   * 仅在成功提交流会话后替换目标文件.
   */
  async function uploadFileStream (
    fileApi: NonNullable<Window['api']>['modloader'],
    targetPath: string,
    file: File,
    onProgress: (percent: number) => void,
  ): Promise<FsResult> {
    const opened = await fileApi.createWriteStream(targetPath)
    if (!opened.success || !opened.id) {
      return { success: false, error: opened.error || '无法创建文件流' }
    }

    const streamId = opened.id
    const reader = file.stream().getReader()
    let transferred = 0
    let closed = false
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const result = await fileApi.writeStreamChunk(streamId, value)
        if (!result.success) return result

        transferred += value.byteLength
        onProgress(Math.round((transferred / file.size) * 100))
      }

      const result = await fileApi.closeStream(streamId, true)
      closed = true
      if (result.success && file.size === 0) onProgress(100)
      return result
    } catch (error) {
      console.error('[模组管理] 写入模组文件流失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '读取或写入文件流失败',
      }
    } finally {
      reader.releaseLock()
      if (!closed) await fileApi.closeStream(streamId, false)
    }
  }
</script>

<style scoped>
.mods-page {
  position: relative;
  width: 100%;
  height: 100%;
}

.mod-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mod-list-item {
  touch-action: none;
  cursor: grab;
  border-radius: 8px;
  transition: box-shadow 0.2s ease;
}

.mod-list-item:active {
  cursor: grabbing;
}
</style>

<style>
/* 拖拽占位卡片. */
.sortable-ghost {
  opacity: 0 !important;
  background: transparent !important;
  border: 2px dashed rgba(var(--v-theme-primary), 0.5) !important;
  border-radius: 8px;
}

/* 已选中的拖拽卡片. */
.sortable-chosen {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22) !important;
  cursor: grabbing !important;
}

/* 正在拖拽的悬浮卡片. */
.sortable-drag {
  opacity: 1 !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28) !important;
  cursor: grabbing !important;
  transform: rotate(1.5deg) scale(1.02);
}
</style>
