import { ref } from 'vue'

/** 顶栏刷新工坊的触发信号, 由 WorkshopPage 负责重新加载目录. */
const refreshSignal = ref(0)

export function useWorkshopActions () {
  function requestRefresh () {
    refreshSignal.value++
  }

  return { refreshSignal, requestRefresh }
}
