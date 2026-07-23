import { ref } from 'vue'

/** 顶栏备份操作的触发信号, 由 BackupPage 监听并执行. */
const createSignal = ref(0)
const importSignal = ref(0)

export function useBackupActions () {
  function requestCreate () {
    createSignal.value++
  }

  function requestImport () {
    importSignal.value++
  }

  return { createSignal, importSignal, requestCreate, requestImport }
}
