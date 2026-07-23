/** 界面层模组模型, 由 mod_order.json 与 scanModInfos 元数据合并生成. */
import type { ModUpdateConfig } from '@/types/window-api'

/** 远程更新信息, 来自 remote URL 或 GitHub latest/download/update.json. */
export interface ModUpdateInfo {
  version: string
  asarUrl: string
  changelog: string
}

/** 模组配置中允许保存的字段值. */
export type ModConfigValue = string | number | boolean

/** 模组配置字段的可用控件类型. */
export type ModConfigFieldType = 'text' | 'password' | 'toggle' | 'number' | 'select'

/** select 配置字段的选项. */
export interface ModConfigOption {
  value: ModConfigValue
  label: string
}

/** modloader.config.json 中的单个配置字段. */
export interface ModConfigField {
  key: string
  type: ModConfigFieldType
  label: string
  default: ModConfigValue
  placeholder?: string
  help?: string
  required?: boolean
  options?: ModConfigOption[]
}

/** modloader.config.json 的解析结果. */
export interface ModConfigDefinition {
  title: string
  description: string
  fields: ModConfigField[]
}

/** 已安装模组在工坊匹配时使用的最小信息. */
export interface InstalledModInfo {
  file: string
  version: string
}

/** 工坊中已解析的注册模组. */
export interface WorkshopModInfo extends ModUpdateInfo {
  id: string
  repo: string
  name: string
  author: string[]
  description: string
  installed: InstalledModInfo | null
  hasUpdate: boolean
}

export interface ModInfo {
  /** 模组唯一 ID, 来自 modloader.mod.json. */
  id?: string
  file: string
  order: number
  enabled: boolean
  /** 格式化后的大小文本, 获取失败时为空字符串. */
  sizeText?: string
  name?: string
  version?: string
  author?: string[]
  description?: string
  /** 更新配置, 来自 modloader.mod.json 的 update 字段. */
  update?: ModUpdateConfig | null
  /** 前置依赖, 如 { "id-a": ">=0.16.0", "id-b": "*" }. */
  depends?: Record<string, string>
  /** 冲突模组, 如 { "id-c": "*", "id-d": "<2.0.0" }. */
  breaks?: Record<string, string>
  /** 模组声明的注入脚本清单, 仅用于界面展示. */
  injections?: Array<{ name?: string, path: string }>
  canConfig?: boolean
  hasUpdate?: boolean
  /** 与其他模组的 ID 相同, 可能导致重复加载. */
  duplicate?: boolean
  /** 已启用模组缺少前置依赖, 或依赖版本不满足要求. */
  dependencyIssue?: boolean
  /** 已启用模组与其他已启用模组存在冲突. */
  conflictIssue?: boolean
  /** 检测到更新时填充的远程版本信息, 无更新时为 null. */
  updateInfo?: ModUpdateInfo | null
}
