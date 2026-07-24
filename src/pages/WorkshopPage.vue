<template>
  <div class="workshop-page">
    <v-container class="pa-4" fluid>
      <div class="workshop-toolbar mb-3">
        <v-text-field
          v-model="searchQuery"
          class="workshop-search"
          clearable
          density="compact"
          hide-details
          label="搜索模组"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </div>

      <v-progress-linear
        v-if="loading"
        class="mb-3 multiline-text"
        color="primary"
        indeterminate
      />

      <v-alert
        v-if="loadError"
        class="mb-3 multiline-text"
        density="compact"
        icon="mdi-alert-circle-outline"
        type="error"
        variant="tonal"
      >
        {{ loadError }}
      </v-alert>

      <v-alert
        v-if="loadNotice"
        class="mb-3"
        density="compact"
        icon="mdi-information-outline"
        type="warning"
        variant="tonal"
      >
        {{ loadNotice }}
      </v-alert>

      <div class="workshop-list">
        <WorkshopModCard
          v-for="mod in filteredMods"
          :key="mod.id"
          class="mb-3"
          :downloading="downloadingId === mod.id"
          :mod="mod"
          :search-terms="searchTerms"
          @download="downloadMod"
        />
      </div>

      <div
        v-if="!loading && !loadError && filteredMods.length === 0"
        class="workshop-empty text-center text-medium-emphasis"
      >
        <v-icon icon="mdi-store-outline" size="42" />
        <div class="text-body-2 mt-3">{{ mods.length > 0 ? '没有匹配的模组' : '工坊暂时没有可用模组' }}</div>
      </div>
    </v-container>
  </div>
</template>

<script lang="ts">
  import type { ModManagerAPI, ModMeta, ModOrderEntry } from '@/types/window-api'
  import type { ModRegistryEntry, ModUpdateManifest } from '@/utils/ModUpdateSource'
  import semver from 'semver'
  import { MOD_ORDER_PATH } from '@/utils/mod-order'
  import { ModUpdateSource } from '@/utils/ModUpdateSource'
</script>

<script setup lang="ts">
  import type { InstalledModInfo, WorkshopModInfo } from '@/types/mod'
  import { computed, onMounted, ref, watch } from 'vue'
  import WorkshopModCard from '@/components/WorkshopModCard.vue'
  import { useDialogs } from '@/composables/useDialogs'
  import { useModDownload } from '@/composables/useModDownload'
  import { useWorkshopActions } from '@/composables/useWorkshopActions'
  import { useProgressStore } from '@/stores/progress'

  const REGISTRY_URL = 'https://raw.githubusercontent.com/shouennyou/DC_mod_registry/main/registry.json'

  interface WorkshopCatalogItem {
    repo: string
    manifest: ModUpdateManifest
  }

  interface WorkshopCatalog {
    items: WorkshopCatalogItem[]
    unavailableCount: number
  }

  let sessionCatalog: WorkshopCatalog | null = null
  let catalogRequest: Promise<WorkshopCatalog> | null = null

  async function fetchWorkshopCatalog (api: ModManagerAPI, force: boolean): Promise<WorkshopCatalog> {
    if (!force && sessionCatalog) return sessionCatalog
    if (catalogRequest) return catalogRequest

    catalogRequest = (async () => {
      const registryResponse = await api.fetchText(REGISTRY_URL)
      if (!registryResponse.success || !registryResponse.text) {
        throw new Error(registryResponse.message || '无法获取工坊注册表')
      }
      const registry = ModUpdateSource.parseRegistry(registryResponse.text)
      if (!registry) {
        throw new Error('工坊注册表格式无效')
      }

      const results = await Promise.all(registry.map(entry => fetchCatalogItems(api, entry)))
      const catalog = {
        items: results.flat(),
        unavailableCount: registry.reduce((count, entry) => count + entry.ids.length, 0) - results.flat().length,
      }
      sessionCatalog = catalog
      return catalog
    })()

    try {
      return await catalogRequest
    } finally {
      catalogRequest = null
    }
  }

  async function fetchCatalogItems (api: ModManagerAPI, entry: ModRegistryEntry): Promise<WorkshopCatalogItem[]> {
    const manifests = await ModUpdateSource.fetchManifests(api, { source: 'github', repo: entry.repo }, entry.ids)
    return manifests.map(manifest => ({ repo: entry.repo, manifest }))
  }

  const dialogs = useDialogs()
  const progress = useProgressStore()
  const { downloadModAsar, updateMod } = useModDownload()
  const { refreshSignal } = useWorkshopActions()
  const mods = ref<WorkshopModInfo[]>([])
  const loading = ref(false)
  const loadError = ref('')
  const loadNotice = ref('')
  const searchQuery = ref('')
  const downloadingId = ref<string | null>(null)

  function indexInstalledMods (modInfos: ModMeta[]): Map<string, InstalledModInfo> {
    const installed = new Map<string, InstalledModInfo>()
    for (const mod of modInfos) {
      if (!mod.id) continue
      const current = installed.get(mod.id)
      const modVersion = mod.version ?? '0.0.0'
      const modComparableVersion = ModUpdateSource.toComparableVersion(modVersion)
      const currentComparableVersion = ModUpdateSource.toComparableVersion(current?.version)
      if (!current || (modComparableVersion && currentComparableVersion && semver.gt(modComparableVersion, currentComparableVersion))) {
        installed.set(mod.id, {
          file: mod.file,
          version: modVersion,
        })
      }
    }
    return installed
  }

  function normalizeSearchText (value: string): string {
    return value.normalize('NFKC').toLocaleLowerCase()
  }

  function isFuzzyMatch (text: string, query: string): boolean {
    let index = 0
    for (const char of query) {
      index = text.indexOf(char, index)
      if (index === -1) return false
      index++
    }
    return true
  }

  const searchTerms = computed(() =>
    normalizeSearchText(searchQuery.value).split(/\s+/).filter(Boolean),
  )

  const filteredMods = computed(() => {
    const terms = searchTerms.value
    if (terms.length === 0) return mods.value

    return mods.value.filter(mod => {
      const fields = [mod.name, mod.id, ...mod.author, mod.description, mod.version, mod.repo]
        .map(field => normalizeSearchText(field))
      return terms.every(term => fields.some(field => field.includes(term) || isFuzzyMatch(field, term)))
    })
  })

  /** 获取会话目录并按本地 ID 更新安装状态, force 为 true 时刷新远端目录. */
  async function loadWorkshop (force = false): Promise<void> {
    const api = window.api?.modmanager
    if (!api || loading.value) return

    loading.value = true
    loadError.value = ''
    loadNotice.value = ''
    try {
      const [catalog, modInfos] = await Promise.all([
        fetchWorkshopCatalog(api, force),
        api.scanModInfos(),
      ])
      const installed = indexInstalledMods(modInfos)
      mods.value = catalog.items
        .map(({ repo, manifest }) => {
          const local = installed.get(manifest.id) ?? null
          const remoteComparableVersion = ModUpdateSource.toComparableVersion(manifest.version)
          const localComparableVersion = ModUpdateSource.toComparableVersion(local?.version)
          const hasUpdate = local !== null
            && remoteComparableVersion !== null
            && localComparableVersion !== null
            && semver.gt(remoteComparableVersion, localComparableVersion)
          return {
            ...manifest,
            repo,
            name: manifest.name || manifest.id,
            installed: local,
            hasUpdate,
          } satisfies WorkshopModInfo
        })
        .toSorted((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

      if (catalog.unavailableCount > 0) {
        loadNotice.value = `${catalog.unavailableCount} 个注册模组的 update.json 无法读取或与注册表 id 不一致.`
      }
    } catch (error) {
      console.error('[模组工坊] 加载工坊失败:', error)
      if (!sessionCatalog) mods.value = []
      loadError.value = error instanceof Error ? error.message : '加载工坊失败'
    } finally {
      loading.value = false
    }
  }

  function safeAsarFileName (name: string): string | null {
    const trimmed = name.trim()
    if (!trimmed || !/\.asar$/i.test(trimmed) || /[\\/:*?"<>|]/.test(trimmed)) {
      return null
    }
    return trimmed
  }

  /** 更新保留本地文件名, 首次下载使用 asarUrl 中的文件名. */
  function downloadFileName (mod: WorkshopModInfo): string | null {
    if (mod.installed) {
      return safeAsarFileName(mod.installed.file)
    }
    try {
      const pathName = new URL(mod.asarUrl).pathname
      const name = decodeURIComponent(pathName.slice(pathName.lastIndexOf('/') + 1))
      return safeAsarFileName(name)
    } catch (error) {
      console.error('[模组工坊] 解析模组下载文件名失败:', error)
      return null
    }
  }

  function parseModOrder (content: string | null): ModOrderEntry[] {
    try {
      const data: unknown = content ? JSON.parse(content) : []
      if (!Array.isArray(data)) return []
      return data.filter((entry): entry is ModOrderEntry =>
        typeof entry === 'object'
        && entry !== null
        && typeof entry.file === 'string'
        && typeof entry.order === 'number',
      )
    } catch (error) {
      console.error('[模组工坊] 解析模组排序配置失败:', error)
      return []
    }
  }

  async function registerNewMod (fileName: string): Promise<void> {
    const api = window.api?.modmanager
    if (!api) throw new Error('仅在应用内可用')

    const entries = parseModOrder(await api.readFile(MOD_ORDER_PATH))
    if (entries.some(entry => entry.file === fileName)) return

    const maxOrder = entries.reduce((max, entry) => Math.max(max, entry.order), 0)
    if (!(await api.setModOrder([...entries, { file: fileName, order: maxOrder + 1, enabled: true }]))) {
      throw new Error('下载完成，但写入模组顺序失败')
    }
  }

  async function downloadMod (mod: WorkshopModInfo): Promise<void> {
    if (downloadingId.value) return
    if (!mod.asarUrl) {
      await dialogs.alert({ title: '无法下载', message: '该模组未提供下载地址。' })
      return
    }
    const fileName = downloadFileName(mod)
    if (!fileName) {
      await dialogs.alert({ title: '无法下载', message: '下载地址未包含有效的 .asar 文件名。' })
      return
    }

    const isUpdate = mod.installed !== null
    downloadingId.value = mod.id
    try {
      const result = isUpdate
        ? await updateMod({ modId: mod.id, fileName, displayName: mod.name || mod.id, asarUrl: mod.asarUrl })
        : await downloadModAsar({ modId: mod.id, fileName, displayName: mod.name || mod.id, asarUrl: mod.asarUrl, title: '下载模组' })
      if (!result.success) return

      if (!isUpdate) {
        await registerNewMod(fileName)
      }
      await loadWorkshop()
      setTimeout(() => progress.remove(fileName), 3000)
    } catch (error) {
      console.error('[模组工坊] 下载模组失败:', error)
      progress.finish(fileName, 'error', error instanceof Error ? error.message : '下载失败')
    } finally {
      downloadingId.value = null
    }
  }

  onMounted(() => {
    void loadWorkshop()
  })

  watch(refreshSignal, () => {
    void loadWorkshop(true)
  })
</script>

<style scoped>
  .workshop-toolbar {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .workshop-search {
    flex: 0 1 440px;
    max-width: 440px;
    width: 100%;
  }

  @media (max-width: 599px) {
    .workshop-toolbar {
      justify-content: stretch;
    }

    .workshop-search {
      flex-basis: 100%;
      max-width: none;
    }
  }

  .workshop-empty {
    padding: 72px 16px;
  }
</style>
