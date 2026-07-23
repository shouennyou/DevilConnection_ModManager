/** 存档备份的界面模型. */
export interface BackupInfo {
  id: string
  /** 备份压缩包文件名. */
  file: string
  /** 是否锁定, 锁定后不可删除. */
  locked: boolean
  /** 备份时间, 使用毫秒时间戳. */
  time: number
  /** 格式化后的压缩包大小, 例如 "12.4 MB". */
  sizeText: string
}
