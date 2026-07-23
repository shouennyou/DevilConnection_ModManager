import { ref } from 'vue'

/** 顶栏安装模组的触发信号, 由 ModsPage 负责完整安装流程. */
const installSignal = ref(0)

export function useModActions () {
  function requestInstall () {
    installSignal.value++
  }

  return { installSignal, requestInstall }
}
