import type ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import type { ModIssueDialogOptions } from '@/components/dialogs/mod-issue-dialog'
import type ModIssueDialog from '@/components/dialogs/ModIssueDialog.vue'
import type RenameDialog from '@/components/dialogs/RenameDialog.vue'
import type { UpdateAction, UpdateDialogOptions } from '@/components/dialogs/update-dialog'
import type UpdateDialog from '@/components/dialogs/UpdateDialog.vue'
import { ref } from 'vue'

const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const modIssueRef = ref<InstanceType<typeof ModIssueDialog> | null>(null)
const renameRef = ref<InstanceType<typeof RenameDialog> | null>(null)
const updateRef = ref<InstanceType<typeof UpdateDialog> | null>(null)

function useDialogs () {
  async function confirm (options: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    confirmColor?: string
    hideCancel?: boolean
  }): Promise<boolean> {
    return confirmRef.value?.open(options) ?? false
  }

  /** 显示仅含确认按钮的提示对话框. */
  async function alert (options: {
    title?: string
    message: string
    confirmText?: string
  }): Promise<void> {
    await confirmRef.value?.open({ ...options, hideCancel: true })
  }

  /** 显示模组重复, 冲突或依赖问题提示. */
  async function showModIssue (options: ModIssueDialogOptions): Promise<void> {
    await modIssueRef.value?.open(options)
  }

  async function rename (options: {
    title?: string
    label?: string
    placeholder?: string
    initialValue?: string
  } = {}): Promise<string | null> {
    return renameRef.value?.open(options) ?? null
  }

  async function showUpdate (options: UpdateDialogOptions): Promise<UpdateAction> {
    return updateRef.value?.open(options) ?? 'cancel'
  }

  return {
    confirm,
    alert,
    showModIssue,
    rename,
    showUpdate,
    confirmRef,
    modIssueRef,
    renameRef,
    updateRef,
  }
}
export { useDialogs }

export { type ModIssueDialogOptions, type ModIssueGroup, type ModIssueKind } from '@/components/dialogs/mod-issue-dialog'
export { type UpdateDialogOptions } from '@/components/dialogs/update-dialog'
