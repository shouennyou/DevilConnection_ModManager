/** UpdateDialog 的选项类型, 独立文件便于跨模块引用. */

/** 更新弹窗的操作结果. */
export type UpdateAction = 'download' | 'jump' | 'cancel'

export interface UpdateDialogOptions {
  name?: string
  version?: string
  changelog?: string
  /** 跳转地址, 模组来自 update.url, ModLoader 来自 GitHub 发布版本页面. */
  url?: string
  /** 是否显示内置下载按钮. */
  showDownload?: boolean
}
