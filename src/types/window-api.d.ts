/** window.api 的类型声明, 仅在 Electron 渲染进程中存在. */

/** mod_order.json 的单条记录, 保存顺序与启用状态. */
export interface ModOrderEntry {
  file: string
  order: number
  enabled?: boolean
}

/** 模组更新配置, source 决定检查和下载方式. */
export interface ModUpdateConfig {
  /** 保留未来 update 配置字段. */
  [key: string]: unknown
  /** remote 请求 url 的 JSON, github 请求最新发布版本的 update.json. */
  source: string
  /** source 为 remote 时使用的远程更新 JSON 地址. */
  url?: string
  /** source 为 github 时使用的 owner/repo. */
  repo?: string
}

/** scanModInfos 返回的模组元信息, 读取自各模组的 modloader.mod.json. */
export interface ModMeta {
  /** 透传 modloader.mod.json 的未识别字段, 用于兼容后续扩展. */
  [key: string]: unknown
  id?: string
  file: string
  name?: string
  version?: string
  /** 作者列表, 来自 modloader.mod.json 的 author 字段. */
  author?: string[]
  update?: ModUpdateConfig | null
  description?: string
  /** 前置依赖, 如 { "id-a": ">=0.16.0", "id-b": "*" }. */
  depends?: Record<string, string>
  /** 冲突模组, 如 { "id-c": "*", "id-d": "<2.0.0" }. */
  breaks?: Record<string, string>
  injections?: Array<{ name?: string, path: string }>
  /** 模组内是否存在 modloader.config.json. */
  canConfig?: boolean
}

/** list 返回的目录条目. */
export interface DirEntry {
  name: string
  isDir: boolean
  isAsar: boolean
}

/** 下载进度事件, result 存在时表示本次下载已结束. */
export interface DownloadProgress {
  fileName: string
  received: number
  total: number
  result?: { success: boolean, message?: string }
}

/** 创建文件流会话的结果, 会话 ID 仅在创建它的渲染进程中有效. */
export interface FileStreamOpenResult extends FsResult {
  id?: string
  /** 只读流返回的原文件大小, 单位为字节. */
  size?: number
}

/** 读取文件流会话一个块的结果, done 为 true 时已到达文件末尾. */
export interface FileStreamReadResult extends FsResult {
  done?: boolean
  chunk?: Uint8Array
}

/** window.api.modmanager, 路径均相对 process.resourcesPath. */
export interface ModManagerAPI {
  list: (subPath: string) => Promise<DirEntry[]>
  /** 同步读取文件内容, asar 内部路径会自动选择读取方式. */
  readFileSync: (subPath: string) => string | null
  /** 同步读取 .asar 内部文件. */
  readAsarFileSync: (subPath: string) => string | null
  /** 异步读取文件内容, asar 内部路径会自动选择读取方式. */
  readFile: (subPath: string) => Promise<string | null>
  /** 异步读取 .asar 内部文件. */
  readAsarFile: (subPath: string) => Promise<string | null>
  scanModInfos: () => Promise<ModMeta[]>
  downloadAndReplace: (url: string, fileName: string) => Promise<{ success: boolean, message?: string }>
  onDownloadProgress: (callback: (data: DownloadProgress) => void) => void
  setModOrder: (orderedMods: ModOrderEntry[]) => Promise<boolean>
  /** 通过主进程发起 HTTP(S) GET 并返回文本, 用于绕过渲染进程 CORS. */
  fetchText: (url: string) => Promise<{ success: boolean, status?: number, text?: string, message?: string }>
  checkGameResources: () => Promise<{ appAsar: boolean, appBakAsar: boolean }>
}

/**
 * stat 与 statSync 返回的文件状态, 不存在时为 null.
 * 类型判定方法由 preload 重建, 其余字段为数值属性.
 */
export interface FileStat {
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
  isBlockDevice: () => boolean
  isCharacterDevice: () => boolean
  isFIFO: () => boolean
  isSocket: () => boolean
  /** 字节大小. */
  size: number
  mode: number
  /** 修改时间, 使用毫秒时间戳. */
  mtimeMs: number
  /** 访问时间, 使用毫秒时间戳. */
  atimeMs: number
  /** 状态变更时间, 使用毫秒时间戳. */
  ctimeMs: number
  /** 创建时间, 使用毫秒时间戳. */
  birthtimeMs: number
  uid: number
  gid: number
  dev: number
  ino: number
  nlink: number
  blocks: number
  blksize: number
}

/** 写入和删除操作的统一返回. */
export interface FsResult {
  success: boolean
  error?: string
}

/** window.api.modloader, 路径必须解析到 process.resourcesPath 或 ../_storage 内. */
export interface ModLoaderAPI {
  /** 同步读取文件文本, 失败时返回 null. */
  readFileSync: (subPath: string) => string | null
  /** 异步读取文件文本, 失败时返回 null. */
  readFile: (subPath: string) => Promise<string | null>
  /** 同步写入文件并自动创建父目录. */
  writeFileSync: (subPath: string, content: string) => FsResult
  /** 异步写入文件并自动创建父目录. */
  writeFile: (subPath: string, content: string) => Promise<FsResult>
  /** 同步读取完整二进制文件, 失败时返回 null. */
  readBufferSync: (subPath: string) => Uint8Array | null
  /** 异步读取完整二进制文件, 失败时返回 null. */
  readBuffer: (subPath: string) => Promise<Uint8Array | null>
  /** 同步写入完整二进制文件并自动创建父目录. */
  writeBufferSync: (subPath: string, buffer: ArrayBuffer) => FsResult
  /** 异步写入完整二进制文件并自动创建父目录. */
  writeBuffer: (subPath: string, buffer: ArrayBuffer) => Promise<FsResult>
  /** 创建二进制读取流会话. */
  createReadStream: (subPath: string) => Promise<FileStreamOpenResult>
  /** 读取流会话的下一块数据, size 最大为 1 MiB. */
  readStreamChunk: (id: string, size?: number) => Promise<FileStreamReadResult>
  /** 创建二进制写入流会话, 提交前目标文件保持不变. */
  createWriteStream: (subPath: string) => Promise<FileStreamOpenResult>
  /** 向写入流会话写入一个二进制块. */
  writeStreamChunk: (id: string, chunk: ArrayBuffer | Uint8Array) => Promise<FsResult>
  /** 关闭流会话, 写入流仅在 commit 为 true 时替换目标. */
  closeStream: (id: string, commit?: boolean) => Promise<FsResult>
  /** 同步追加文本并自动创建父目录. */
  appendFileSync: (subPath: string, content: string) => FsResult
  /** 异步追加文本并自动创建父目录. */
  appendFile: (subPath: string, content: string) => Promise<FsResult>
  /** 同步删除文件. */
  unlinkSync: (subPath: string) => FsResult
  /** 异步删除文件. */
  unlink: (subPath: string) => Promise<FsResult>
  /** 同步递归删除文件夹, 不存在时视为成功. */
  rmdirSync: (subPath: string) => FsResult
  /** 异步递归删除文件夹, 不存在时视为成功. */
  rmdir: (subPath: string) => Promise<FsResult>
  /** 同步获取文件状态, 不存在时返回 null. */
  statSync: (subPath: string) => FileStat | null
  /** 异步获取文件状态, 不存在时返回 null. */
  stat: (subPath: string) => Promise<FileStat | null>
  /** 同步获取文件或目录大小, 目录包含全部子项, 失败时返回 null. */
  getSizeSync: (subPath: string) => number | null
  /** 异步获取文件或目录大小, 目录包含全部子项, 失败时返回 null. */
  getSize: (subPath: string) => Promise<number | null>
  /** 同步读取目录项名称数组, 失败时返回 null. */
  readdirSync: (subPath: string) => string[] | null
  /** 异步读取目录项名称数组, 失败时返回 null. */
  readdir: (subPath: string) => Promise<string[] | null>
  /** 同步判断文件或目录是否存在. */
  existsSync: (subPath: string) => boolean
  /** 异步判断文件或目录是否存在. */
  exists: (subPath: string) => Promise<boolean>
  /** 同步重命名或移动文件并自动创建目标父目录. */
  renameSync: (oldPath: string, newPath: string) => FsResult
  /** 异步重命名或移动文件并自动创建目标父目录. */
  rename: (oldPath: string, newPath: string) => Promise<FsResult>
  /** 同步递归创建目录. */
  mkdirSync: (subPath: string) => FsResult
  /** 异步递归创建目录. */
  mkdir: (subPath: string) => Promise<FsResult>
  /** 同步复制文件并自动创建目标父目录. */
  copyFileSync: (srcPath: string, destPath: string) => FsResult
  /** 异步复制文件并自动创建目标父目录. */
  copyFile: (srcPath: string, destPath: string) => Promise<FsResult>
}

/** 备份列表项. */
export interface BackupEntry {
  file: string
  locked: boolean
  /** 修改时间, 使用毫秒时间戳. */
  time: number
  /** 字节大小. */
  size: number
}

/** window.api.backup, 用于管理 _storage 中 .sav 文件的备份. */
export interface BackupAPI {
  list: () => Promise<BackupEntry[]>
  create: (name?: string) => Promise<{ success: boolean, file?: string, count?: number, noSave?: boolean, message?: string }>
  restore: (file: string) => Promise<{ success: boolean, count?: number, message?: string }>
  delete: (file: string) => Promise<{ success: boolean, message?: string }>
  rename: (oldName: string, newName: string) => Promise<{ success: boolean, file?: string, message?: string }>
  setLock: (file: string, locked: boolean) => Promise<{ success: boolean, message?: string }>
  export: (file: string) => Promise<{ success: boolean, path?: string, canceled?: boolean, message?: string }>
  import: () => Promise<{ success: boolean, file?: string, canceled?: boolean, message?: string }>
  cleanup: (retainDays: number, retainCount: number) => Promise<{ success: boolean, deleted: number }>
}

declare global {
  interface Window {
    api?: {
      [key: string]: unknown
      modmanager: ModManagerAPI
      modloader: ModLoaderAPI
      backup: BackupAPI
      /** 由管理器 preload 暴露, 用于创建并聚焦游戏窗口. */
      launchGame?: () => Promise<boolean>
      /** 由宿主壳 preload 暴露, 用系统浏览器打开外部链接. */
      openWebPage?: (url: string) => Promise<void>
      /** 由宿主壳 preload 暴露, 返回当前 Steam 开关状态. */
      getSteamEnabled?: () => Promise<boolean>
      /** 由宿主壳 preload 暴露, 返回 Steam 模式是否开启及是否已连接. */
      getSteamStatus?: () => Promise<{ configured: boolean, active: boolean }>
      /** 由宿主壳 preload 暴露, 切换 Steam 开关后退出程序使配置生效. */
      setSteamEnabled?: (enabled: boolean) => Promise<void>
    }
  }
}
