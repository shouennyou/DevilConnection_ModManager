import { computed } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import { useAppStore } from '@/stores/app'

export function useAppTheme () {
  const store = useAppStore()
  const theme = useVuetifyTheme()

  const currentTheme = computed(() => store.themeMode)

  function applyTheme (): void {
    const isDark
      = store.themeMode === 'dark'
        || (store.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    theme.change(isDark ? 'dark' : 'light')
  }

  function setThemeMode (mode: 'light' | 'dark' | 'system'): void {
    store.setThemeMode(mode)
    applyTheme()
  }

  function initTheme (): void {
    applyTheme()

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      if (store.themeMode === 'system') {
        applyTheme()
      }
    })
  }

  return {
    currentTheme,
    setThemeMode,
    initTheme,
  }
}
