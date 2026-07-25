import type { ModLoaderAPI } from '@/types/window-api'

/** ModLoader 版本文件相对 resourcesPath 的路径. */
export const MODLOADER_VERSION_PATH = 'app.asar/node_modules/dc-modloader/version.json'

/** 旧版 version.json 不含 id 时使用的兼容 ID. */
const LEGACY_MODLOADER_ID = 'modloader'

export interface ModLoaderVersionInfo {
  id: string
  version: string
}

function nonEmptyString (value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const text = value.trim()
  return text || null
}

/** 解析 ModLoader 版本文件. 旧版文件缺少 id 时仍按 modloader 处理. */
export function parseModLoaderVersion (content: string | null): ModLoaderVersionInfo | null {
  if (!content) {
    return null
  }

  const payload: unknown = JSON.parse(content)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const json = payload as Record<string, unknown>
  const version = nonEmptyString(json.version)
  if (!version) {
    return null
  }

  return {
    id: nonEmptyString(json.id) ?? LEGACY_MODLOADER_ID,
    version,
  }
}

/** 读取当前安装的 ModLoader 标识和版本. */
export async function readModLoaderVersion (api: Pick<ModLoaderAPI, 'readFile'>): Promise<ModLoaderVersionInfo | null> {
  try {
    return parseModLoaderVersion(await api.readFile(MODLOADER_VERSION_PATH))
  } catch (error) {
    console.error('[ModLoader 版本] 读取本地版本失败:', error)
    return null
  }
}
