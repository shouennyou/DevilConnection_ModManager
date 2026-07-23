<template>
  <v-bottom-navigation
    v-model="selected"
    class="nav-bottom"
    grow
  >
    <v-btn
      v-for="item in navItems"
      :key="item.to"
      :value="item.to"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span class="text-caption mt-1">{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'

  const route = useRoute()
  const router = useRouter()

  const navItems = [
    { to: '/', title: '主页', icon: 'mdi-home-outline' },
    { to: '/mods', title: '模组', icon: 'mdi-puzzle-outline' },
    { to: '/backup', title: '备份', icon: 'mdi-folder-zip-outline' },
    { to: '/settings', title: '设置', icon: 'mdi-cog-outline' },
  ]

  // 将选中状态与路由双向同步, 非底栏页面不高亮任何项.
  const selected = computed<string | null>({
    get: () => (navItems.some(i => i.to === route.path) ? route.path : null),
    set: val => {
      if (val && val !== route.path) router.push(val)
    },
  })
</script>

<style scoped>
.nav-bottom {
  border-top: none !important;
}
</style>
