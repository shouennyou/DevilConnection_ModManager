import type { ModIssueDialogOptions, ModIssueGroup } from '@/components/dialogs/mod-issue-dialog'
import semver from 'semver'

/** 用于检测模组问题的最小模组信息. */
export interface ModIssueMod {
  id?: string
  file: string
  name?: string
  version?: string
  enabled: boolean
  depends?: Record<string, string>
  breaks?: Record<string, string>
}

/** 模组问题检测结果, 包含重复 ID 和可直接展示的弹窗选项. */
export interface ModIssueCheckResult {
  duplicateIds: Set<string>
  dependencyFiles: Set<string>
  conflictFiles: Set<string>
  dialogs: ModIssueDialogOptions[]
}

function displayName (mod: ModIssueMod): string {
  return mod.name || mod.file
}

function displayMod (mod: ModIssueMod): string {
  return `${displayName(mod)} (${mod.file})`
}

/** 判断目标版本是否命中依赖或冲突规则, 仅 "*" 表示任意版本. */
function isVersionMatched (version: string | undefined, range: string): boolean {
  const expectedRange = range.trim()
  if (expectedRange === '*') {
    return true
  }
  if (!expectedRange || !version) {
    return false
  }

  const validRange = semver.validRange(expectedRange)
  const validVersion = semver.valid(version)
  return validRange != null
    && validVersion != null
    && semver.satisfies(validVersion, validRange, { includePrerelease: true })
}

function dependencyItem (id: string, range: string, target: ModIssueMod | undefined): string {
  const expectedRange = range.trim()
  if (!target) {
    return expectedRange && expectedRange !== '*'
      ? `缺少 ID "${id}", 需要版本 "${expectedRange}"`
      : `缺少 ID "${id}"`
  }

  const actualVersion = target.version || '未知版本'
  return `需要 ID "${id}" 版本 "${expectedRange}", 当前为 "${actualVersion}"`
}

/** 检测已启用模组的重复 ID, 依赖和冲突问题. */
export function inspectModIssues (mods: ModIssueMod[]): ModIssueCheckResult {
  const enabledMods = mods.filter(mod => mod.enabled && Boolean(mod.id))
  const modsById = new Map<string, ModIssueMod[]>()
  for (const mod of enabledMods) {
    const id = mod.id as string
    const group = modsById.get(id) ?? []
    group.push(mod)
    modsById.set(id, group)
  }

  const duplicateGroups = [...modsById].filter(([, group]) => group.length > 1)
  const duplicateIds = new Set(duplicateGroups.map(([id]) => id))
  const dependencyFiles = new Set<string>()
  const conflictFiles = new Set<string>()
  const dialogs: ModIssueDialogOptions[] = []

  if (duplicateGroups.length > 0) {
    dialogs.push({
      kind: 'duplicate',
      description: '以下已启用模组存在相同 ID, 可能重复加载导致异常. 每组请只保留一个.',
      groups: duplicateGroups.map(([id, group]) => ({
        title: `ID "${id}"`,
        items: group.map(mod => displayMod(mod)),
      })),
    })
  }

  const dependencyGroups: ModIssueGroup[] = []
  for (const mod of enabledMods) {
    const items: string[] = []
    for (const [id, range] of Object.entries(mod.depends ?? {})) {
      const targets = modsById.get(id)
      if ((targets?.length ?? 0) > 1) {
        items.push(`ID "${id}" 存在重复模组, 无法确认依赖`)
        continue
      }

      const target = targets?.[0]
      if (!target || !isVersionMatched(target.version, range)) {
        items.push(dependencyItem(id, range, target))
      }
    }
    if (items.length > 0) {
      dependencyFiles.add(mod.file)
      dependencyGroups.push({ title: displayMod(mod), items })
    }
  }

  if (dependencyGroups.length > 0) {
    dialogs.push({
      kind: 'dependency',
      description: '以下已启用模组缺少前置依赖, 或依赖版本不满足要求.',
      groups: dependencyGroups,
    })
  }

  const processedConflictPairs = new Set<string>()
  const conflictGroups: ModIssueGroup[] = []
  for (const mod of enabledMods) {
    const items: string[] = []
    for (const [id, range] of Object.entries(mod.breaks ?? {})) {
      for (const target of modsById.get(id) ?? []) {
        if (target.file === mod.file || !isVersionMatched(target.version, range)) {
          continue
        }

        const pairKey = [mod.file, target.file].toSorted().join('\u0000')
        if (processedConflictPairs.has(pairKey)) {
          continue
        }
        processedConflictPairs.add(pairKey)
        conflictFiles.add(mod.file)
        conflictFiles.add(target.file)

        const expectedRange = range.trim()
        const versionText = expectedRange && expectedRange !== '*'
          ? `, 匹配冲突版本 "${expectedRange}"`
          : ''
        items.push(`与 ${displayMod(target)} 冲突${versionText}`)
      }
    }
    if (items.length > 0) {
      conflictGroups.push({ title: displayMod(mod), items })
    }
  }

  if (conflictGroups.length > 0) {
    dialogs.push({
      kind: 'conflict',
      description: '以下已启用模组声明互相冲突, 同时启用可能导致游戏异常.',
      groups: conflictGroups,
    })
  }

  return { duplicateIds, dependencyFiles, conflictFiles, dialogs }
}
