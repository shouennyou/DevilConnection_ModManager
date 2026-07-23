/** 集中维护 GitHub 仓库标识, 仅填写 owner/repo. */

/** ModLoader 更新检测使用的仓库. */
export const MODLOADER_REPO = 'shouennyou/DevilConnection_ModLoader'

/** 返回仓库主页 URL. */
export function githubUrl (repo: string): string {
  return `https://github.com/${repo}`
}

/** 返回 GitHub 发布版本 API 的 URL. */
export function githubReleasesApi (repo: string): string {
  return `https://api.github.com/repos/${repo}/releases`
}
