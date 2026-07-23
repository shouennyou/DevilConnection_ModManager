<template>
  <v-container class="pa-4" fluid>
    <div class="text-center mb-6">
      <v-icon class="text-primary mb-2" icon="mdi-puzzle-heart-outline" size="56" />

      <div class="text-caption text-medium-emphasis mt-1">
        DC Mod Manager v{{ appVersion }}
      </div>
    </div>

    <v-card class="mb-4" rounded="lg">
      <v-list>
        <v-list-item
          prepend-icon="mdi-github"
          :subtitle="MODLOADER_REPO"
          title="ModLoader 开源地址"
          @click="openLink(githubUrl(MODLOADER_REPO))"
        >

          <template #append>
            <v-icon icon="mdi-open-in-new" size="16" />
          </template>
        </v-list-item>
        <!--
        <v-divider />

        <v-list-item
          v-for="(group, i) in QQ_GROUPS"
          :key="group.number"
          prepend-icon="mdi-qqchat"
          :subtitle="group.number"
          :title="QQ_GROUPS.length > 1 ? `交流反馈 Q 群 ${i + 1}` : '交流反馈 Q 群'"
          @click="openLink(group.url)"
        >
          <template #append>
            <v-icon icon="mdi-open-in-new" size="16" />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item
          prepend-icon="mdi-hand-heart"
          subtitle="爱发电"
          title="赞助支持"
          @click="openLink(AFDIAN_URL)"
        >
          <template #append>
            <v-icon icon="mdi-open-in-new" size="16" />
          </template>
        </v-list-item>
        -->
      </v-list>
    </v-card>

    <v-card class="pa-4" rounded="lg">
      <div class="d-flex align-center justify-space-between">
        <div class="min-w-0">
          <div class="text-body-2 font-weight-medium">
            ModLoader 版本
            <span class="text-primary font-weight-bold ml-1">
              {{ localVersion || '未知' }}
            </span>
          </div>

          <div class="text-caption text-medium-emphasis text-truncate">
            {{ statusText }}
          </div>
        </div>

        <v-btn
          color="primary"
          :loading="checking"
          variant="tonal"
          @click="onCheckButton"
        >
          {{ hasUpdate ? '查看更新' : '检查更新' }}
        </v-btn>
      </div>
    </v-card>

    <v-alert
      class="mt-4 multiline-text"
      density="comfortable"
      icon="mdi-alert-circle-outline"
      title="法律声明"
      type="warning"
      variant="tonal"
    >
      1. 本项目为粉丝开源作品，与 [游戏名称] 开发商无任何利益关联。
      <br>
      2. 用户需自行承担使用本工具带来的全部后果（含存档异常等）。
      <br>
      3. 本项目严禁用于商业用途。开发者不对本工具的完整性及兼容性做任何保证。
      <br>
      4. 使用前请务必确认您已拥有原游戏合法授权，请尊重开发者劳动成果，支持正版。
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useModLoaderUpdate } from '@/composables/useModLoaderUpdate'
  import { githubUrl, MODLOADER_REPO } from '@/config/repos'
  import { useAppStore } from '@/stores/app'

  /** 可替换的社区和赞助链接配置. */
  /*
  const QQ_GROUPS = [
    { number: '群号待填 000000000', url: 'https://qm.qq.com/' },
  ]
  const AFDIAN_URL = ''
  */

  const appStore = useAppStore()

  /** 编译时注入的管理器版本, 不参与在线更新检测. */
  const appVersion = __APP_VERSION__

  const { checking, hasUpdate, localVersion, statusText, check, showDialog, refreshLocalVersion } = useModLoaderUpdate()

  function openLink (url: string) {
    if (!url) return
    if (window.api?.openWebPage) {
      window.api.openWebPage(url)
    } else {
      window.open(url, '_blank')
    }
  }

  async function onCheckButton () {
    if (hasUpdate.value) {
      await showDialog()
      return
    }
    await check()
    if (hasUpdate.value) await showDialog()
  }

  // 进入页面时读取本地版本, 按设置决定是否联网检查更新.
  onMounted(() => {
    void refreshLocalVersion()
    if (appStore.autoCheckUpdate) check()
  })
</script>
