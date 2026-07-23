import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 启动自动备份的状态, 用于主页展示和启动条件判断. */
export type BackupStatus = 'idle' | 'running' | 'success' | 'error'

export const useBackupStatusStore = defineStore('backupStatus', () => {
  const status = ref<BackupStatus>('idle')
  const message = ref('')
  /** 本次启动是否已执行自动备份, 用于避免重复触发. */
  const done = ref(false)

  function set (s: BackupStatus, msg = ''): void {
    status.value = s
    message.value = msg
  }

  return { status, message, done, set }
})
