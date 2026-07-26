import type { ModManagerAPI } from '@/types/window-api'

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

/** 解析由主进程读取的 ModLoader 包元数据. */
export function parseModLoaderVersion (payload: unknown): ModLoaderVersionInfo | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const json = payload as Record<string, unknown>
  const id = nonEmptyString(json.name)
  const version = nonEmptyString(json.version)
  if (!id || !version) {
    return null
  }

  return {
    id,
    version,
  }
}

/** 读取当前安装的 ModLoader 标识和版本. */
export async function readModLoaderVersion (api: Pick<ModManagerAPI, 'getModLoaderPackageInfo'>): Promise<ModLoaderVersionInfo | null> {
  try {
    return parseModLoaderVersion(await api.getModLoaderPackageInfo())
  } catch (error) {
    console.error('[ModLoader 版本] 读取本地版本失败:', error)
    return null
  }
}
