import type { ModUpdateInfo } from '@/types/mod'
import type { ModManagerAPI, ModUpdateConfig } from '@/types/window-api'
import semver from 'semver'

type UpdateFetcher = Pick<ModManagerAPI, 'fetchText'>

/** 模组工坊注册表中的单条记录. */
export interface ModRegistryEntry {
  id: string
  repo: string
}

/** update.json 提供的完整模组元数据. */
export interface ModUpdateManifest extends ModUpdateInfo {
  id: string
  name: string
  author: string[]
  description: string
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

/**
 * 统一解析模组更新源.
 * - remote: 直接请求 update.url.
 * - github: 请求 owner/repo 最新发布版本的固定 update.json 下载地址.
 */
export class ModUpdateSource {
  /** 获取指定模组的更新信息, 数组格式会按 targetId 选择对应记录. */
  static async fetch (
    api: UpdateFetcher,
    update: ModUpdateConfig,
    targetId?: string,
  ): Promise<ModUpdateInfo | null> {
    const url = this.resolveUrl(update)
    if (!url) {
      return null
    }

    return this.fetchByUrl(api, url, text => this.parse(text, targetId))
  }

  /** 获取并解析工坊展示所需的完整 update.json. */
  static async fetchManifest (
    api: UpdateFetcher,
    update: ModUpdateConfig,
    targetId?: string,
  ): Promise<ModUpdateManifest | null> {
    const url = this.resolveUrl(update)
    if (!url) {
      return null
    }

    return this.fetchByUrl(api, url, text => this.parseManifest(text, targetId))
  }

  static resolveUrl (update: ModUpdateConfig): string | null {
    if (update.source === 'github') {
      return this.githubLatestDownloadUrl(update.repo)
    }
    return update.url?.trim() || null
  }

  static githubLatestDownloadUrl (repo?: string): string | null {
    const normalized = repo?.trim().replace(/\.git$/i, '') ?? ''
    const parts = normalized.split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null
    }

    const [owner, name] = parts
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/latest/download/update.json`
  }

  /** 解析单对象旧格式或按 ID 查找数组新格式的更新信息. */
  static parse (text: string, targetId?: string): ModUpdateInfo | null {
    const payload = this.parseJson(text)
    const entry = this.selectEntry(payload, targetId)
    return entry ? this.parseUpdateInfo(entry) : null
  }

  /** 解析包含 id, name, author 列表和 description 的工坊 update.json. */
  static parseManifest (text: string, targetId?: string): ModUpdateManifest | null {
    const payload = this.parseJson(text)
    const entry = this.selectEntry(payload, targetId)
    const update = entry ? this.parseUpdateInfo(entry) : null
    if (!entry || !update || typeof entry.id !== 'string' || !entry.id.trim()) {
      return null
    }

    return {
      ...update,
      id: entry.id.trim(),
      name: typeof entry.name === 'string' ? entry.name.trim() : '',
      author: Array.isArray(entry.author)
        ? entry.author.filter((author): author is string => typeof author === 'string').map(author => author.trim()).filter(Boolean)
        : [],
      description: typeof entry.description === 'string' ? entry.description.trim() : '',
    }
  }

  /** 解析 registry.json, 跳过无效或重复 ID 的记录. */
  static parseRegistry (text: string): ModRegistryEntry[] | null {
    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch (error) {
      console.error('[模组更新源] 解析模组注册表失败:', error)
      return null
    }
    if (!Array.isArray(payload)) {
      return null
    }

    const ids = new Set<string>()
    const entries: ModRegistryEntry[] = []
    for (const item of payload) {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.repo !== 'string') {
        continue
      }
      const id = item.id.trim()
      const repo = item.repo.trim()
      if (!id || ids.has(id) || !this.githubLatestDownloadUrl(repo)) {
        continue
      }
      ids.add(id)
      entries.push({ id, repo })
    }
    return entries
  }

  private static async fetchByUrl<T> (
    api: UpdateFetcher,
    url: string,
    parse: (text: string) => T | null,
  ): Promise<T | null> {
    const response = await api.fetchText(url)
    if (!response.success || !response.text) {
      return null
    }
    return parse(response.text)
  }

  private static parseJson (text: string): unknown {
    try {
      return JSON.parse(text)
    } catch (error) {
      console.error('[模组更新源] 解析更新元数据失败:', error)
      return null
    }
  }

  /**
   * 选择与目标 ID 对应的更新记录.
   * 旧对象格式未声明 ID 时保持兼容, 数组格式必须提供精确 ID.
   */
  private static selectEntry (payload: unknown, targetId?: string): Record<string, unknown> | null {
    const id = targetId?.trim() ?? ''
    if (Array.isArray(payload)) {
      if (!id) {
        return null
      }
      return payload.find(item => typeof item === 'object'
        && item !== null
        && !Array.isArray(item)
        && typeof item.id === 'string'
        && item.id.trim() === id) ?? null
    }
    if (!isRecord(payload)) {
      return null
    }

    const entryId = typeof payload.id === 'string' ? payload.id.trim() : ''
    if (id && entryId && entryId !== id) {
      return null
    }
    return payload
  }

  private static parseUpdateInfo (payload: Record<string, unknown>): ModUpdateInfo | null {
    const version = typeof payload.version === 'string' ? payload.version.trim() : ''
    if (!version || !semver.valid(version)) {
      return null
    }
    return {
      version,
      asarUrl: typeof payload.asarUrl === 'string' ? payload.asarUrl : '',
      changelog: typeof payload.changelog === 'string' ? payload.changelog : '',
    }
  }
}
