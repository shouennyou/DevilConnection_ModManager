<template>
  <v-navigation-drawer
    v-model="drawer"
    class="nav-drawer"
    :permanent="!mobile"
    :rail="rail && !mobile"
    rail-width="72"
    :temporary="mobile"
    width="240"
  >
    <v-list class="pa-2" density="comfortable" nav @touchstart.passive="onTouchStart">
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :active="$route.path === item.to"
        class="mb-1"
        :prepend-icon="item.icon"
        rounded="lg"
        :title="item.title"
        :value="item.to"
        @click="handleNav(item.to, $event)"
      />
    </v-list>

    <template v-if="!mobile" #append>
      <div class="pa-2">
        <v-btn
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          size="small"
          variant="text"
          @click="rail = !rail"
        />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'

  const router = useRouter()
  const { mobile } = useDisplay()
  const rail = ref(false)
  const drawer = ref(true)

  let touchStartX = 0
  let touchStartY = 0

  function onTouchStart (e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function handleNav (to: string, e: MouseEvent | TouchEvent | KeyboardEvent) {
    if (e instanceof TouchEvent) {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartX)
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY)
      if (dx >= 10 || dy >= 10) return
    }
    router.push(to)
  }

  const navItems = [
    { to: '/', title: '主页', icon: 'mdi-home-outline' },
    { to: '/mods', title: '模组管理', icon: 'mdi-puzzle-outline' },
    { to: '/workshop', title: '模组工坊', icon: 'mdi-store-outline' },
    { to: '/backup', title: '存档备份', icon: 'mdi-folder-zip-outline' },
    { to: '/settings', title: '全局设置', icon: 'mdi-cog-outline' },
    { to: '/about', title: '关于', icon: 'mdi-information-outline' },
  ]
</script>

<style scoped>
.nav-drawer {
  border-right: none !important;
}
</style>
