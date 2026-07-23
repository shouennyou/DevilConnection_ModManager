/** 模组问题弹窗的可扩展类型, 供重复, 冲突和依赖检测共用. */
export type ModIssueKind = 'duplicate' | 'conflict' | 'dependency'

/** 同类问题中的一个模组分组. */
export interface ModIssueGroup {
  title: string
  items: string[]
}

/** 模组问题弹窗的显示选项. */
export interface ModIssueDialogOptions {
  kind?: ModIssueKind
  title?: string
  description?: string
  groups?: ModIssueGroup[]
  confirmText?: string
}
