import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { Octokit } from '@octokit/rest'
import { coerce, compare, valid } from 'semver'

/** 配置 GitHub 客户端的重试和限流处理. */
const AppOctokit = Octokit.plugin(retry, throttling)
type AppOctokitInstance = InstanceType<typeof AppOctokit>

const USER_AGENT = 'dc-modmanager'

const githubRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/

function parseRepoUrl (url: string): { owner: string, repo: string } | null {
  const m = url.match(githubRegex)
  if (m) {
    return { owner: m[1], repo: m[2] }
  }
  const parts = url.split('/')
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] }
  }
  return null
}

function parseVersion (tag: string): string {
  // 优先保留有效的 semver 和预发布标记, 其他标签再提取 x.y.z.
  return valid(tag) ?? coerce(tag)?.version ?? tag.replace(/^v/i, '')
}

export interface Asset {
  name: string
  size: number
  browserDownloadUrl: string
}

export interface Release {
  tag: string
  version: string
  name: string
  body: string
  publishedAt: string
  isDraft: boolean
  isPrerelease: boolean
  htmlUrl: string
  assets: Asset[]
}

export interface UpdateInfo {
  latest: Release | null
  latestStable: Release | null
  latestPreview: Release | null
  hasUpdate: boolean
  hasPreview: boolean
}

export interface ModReleaseInfo {
  owner: string
  repo: string
  releases: Release[]
  updateInfo: UpdateInfo
}

class Updater {
  private octokit: AppOctokitInstance

  constructor () {
    this.octokit = this.build()
  }

  /** 拉取仓库全部发布版本, 正式版和预览版均从该结果中筛选. */
  async getReleases (repoUrl: string): Promise<Release[]> {
    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) {
      throw new Error(`无效的 GitHub 仓库地址: ${repoUrl}`)
    }
    return this.fetchReleases(parsed.owner, parsed.repo)
  }

  /** 从已获取的发布版本计算更新信息, 不发起网络请求. */
  computeUpdate (
    releases: Release[],
    currentVersion: string,
    options?: { includePreview?: boolean },
  ): UpdateInfo {
    // 不依赖 GitHub 的发布时间, 按解析后的 semver 选择最高版本.
    const latest = this.selectLatest(releases, () => true)
    const latestStable = this.selectLatest(releases, r => !r.isPrerelease)
    const latestPreview = this.selectLatest(releases, r => r.isPrerelease)

    const target = options?.includePreview
      ? latest ?? latestStable
      : latestStable ?? latest

    // 本地版本和远端标签均先规范为 semver, 仅在远端版本更高时提示更新.
    const current = parseVersion(currentVersion)
    const hasUpdate = target !== null
      && valid(target.version) !== null
      && valid(current) !== null
      && compare(target.version, current) > 0

    return {
      latest,
      latestStable,
      latestPreview,
      hasUpdate,
      hasPreview: latestPreview !== null,
    }
  }

  async checkAppUpdate (
    repoUrl: string,
    currentVersion: string,
    options?: { includePreview?: boolean },
  ): Promise<UpdateInfo> {
    return this.computeUpdate(await this.getReleases(repoUrl), currentVersion, options)
  }

  async getModReleases (
    owner: string,
    repo: string,
  ): Promise<ModReleaseInfo> {
    const releases = await this.fetchReleases(owner, repo)
    const stable = releases.filter(r => !r.isPrerelease)
    const preview = releases.filter(r => r.isPrerelease)

    const allSorted = [...stable, ...preview].toSorted((a, b) =>
      compare(b.version, a.version),
    )

    const latestStable = this.selectLatest(releases, r => !r.isPrerelease)
    const latestPreview = this.selectLatest(releases, r => r.isPrerelease)

    return {
      owner,
      repo,
      releases: allSorted,
      updateInfo: {
        latest: latestPreview ?? latestStable,
        latestStable,
        latestPreview,
        hasUpdate: false,
        hasPreview: latestPreview !== null && latestStable !== null,
      },
    }
  }

  async getModReleasesByUrl (
    repoUrl: string,
  ): Promise<ModReleaseInfo> {
    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) {
      throw new Error(`无效的 GitHub 仓库地址: ${repoUrl}`)
    }
    return this.getModReleases(parsed.owner, parsed.repo)
  }

  hasUpdate (current: string, latest: string): boolean {
    if (valid(current) === null || valid(latest) === null) {
      return false
    }
    return compare(latest, current) > 0
  }

  isNewer (a: string, b: string): boolean {
    return compare(a, b) > 0
  }

  /** 创建匿名 GitHub 客户端, 保留网络重试和限流处理. */
  private build (): AppOctokitInstance {
    return new AppOctokit({
      userAgent: USER_AGENT,
      throttle: {
        // 主速率限制最多自动重试 2 次.
        onRateLimit: (retryAfter, options, _octokit, retryCount) => {
          _octokit.log.warn(`GitHub 请求额度已用尽: ${options.method} ${options.url}, ${retryAfter} 秒后重试`)
          return retryCount < 2
        },
        // 二级速率限制仅记录警告, 不自动重试.
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(`GitHub 二级限流: ${options.method} ${options.url}`)
          return false
        },
      },
    })
  }

  private async fetchReleases (
    owner: string,
    repo: string,
  ): Promise<Release[]> {
    const { data } = await this.octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 100,
    })
    return data
      .filter(r => !r.draft)
      .map(r => ({
        tag: r.tag_name,
        version: parseVersion(r.tag_name),
        name: r.name ?? r.tag_name,
        body: r.body ?? '',
        publishedAt: r.published_at ?? '',
        isDraft: r.draft,
        isPrerelease: r.prerelease,
        htmlUrl: r.html_url,
        assets: (r.assets ?? []).map(a => ({
          name: a.name,
          size: a.size,
          browserDownloadUrl: a.browser_download_url,
        })),
      }))
  }

  private selectLatest (
    releases: Release[],
    predicate: (r: Release) => boolean,
  ): Release | null {
    const sorted = [...releases]
      .filter(r => predicate(r))
      .filter(r => valid(r.version) !== null)
      .toSorted((a, b) => compare(b.version, a.version))
    return sorted[0] ?? null
  }
}

/** 全应用共享的匿名 GitHub 客户端. */
export const updater = new Updater()

export { parseRepoUrl }
export default Updater
