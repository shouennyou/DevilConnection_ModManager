import { createRouter, createWebHashHistory } from 'vue-router'
import AboutPage from '@/pages/AboutPage.vue'
import BackupPage from '@/pages/BackupPage.vue'
import HomePage from '@/pages/HomePage.vue'
import ModsPage from '@/pages/ModsPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import WorkshopPage from '@/pages/WorkshopPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/mods',
      name: 'mods',
      component: ModsPage,
    },
    {
      path: '/workshop',
      name: 'workshop',
      component: WorkshopPage,
    },
    {
      path: '/backup',
      name: 'backup',
      component: BackupPage,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutPage,
    },
  ],
})

export default router
