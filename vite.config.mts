import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import Fonts from 'unplugin-fonts/vite'
import { defineConfig } from 'vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

interface PackageManifest {
  version?: unknown
}

/** 构建时从 package.json 读取版本号, 供源码常量和 HTML 标题共用. */
const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8')) as PackageManifest
if (typeof pkg.version !== 'string' || !pkg.version.trim()) {
  throw new Error('package.json 缺少有效的版本号')
}
const appVersion = pkg.version.trim()

/**
 * 仅保留 Material Design Icons 字体的 woff2 格式.
 * Electron Chromium 支持 woff2, 移除旧格式可避免打包冗余字体资源.
 */
function mdiWoff2Only (): Plugin {
  return {
    name: 'mdi-woff2-only',
    enforce: 'pre',
    transform (code: string, id: string) {
      if (!/materialdesignicons\.css/.test(id)) {
        return
      }
      const next = code
        // 移除旧版 eot 的独立 src 声明.
        .replace(/src:\s*url\([^)]*\.eot[^)]*\);\s*/g, '')
        // 移除 eot、woff 和 ttf 片段, 保留 woff2 引用.
        .replace(/,?\s*url\([^)]*\.eot[^)]*\)\s*format\((["'])embedded-opentype\1\)/g, '')
        .replace(/,?\s*url\([^)]*\.woff\?[^)]*\)\s*format\((["'])woff\1\)/g, '')
        .replace(/,?\s*url\([^)]*\.ttf[^)]*\)\s*format\((["'])truetype\1\)/g, '')
      return next === code ? undefined : next
    },
  }
}

/** 在开发和构建阶段将 HTML 标题中的版本占位符替换为 package.json 版本号. */
function injectHtmlVersion (): Plugin {
  return {
    name: 'inject-html-version',
    transformIndexHtml (html) {
      return html.replaceAll('%APP_VERSION%', appVersion)
    },
  }
}

export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 按依赖拆分代码块, 避免单个产物过大.
        manualChunks (id: string) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('vuetify')) {
            return 'vuetify'
          }
          if (id.includes('octokit')) {
            return 'octokit'
          }
          if (/[\\/](?:@vue|vue-router|vue-demi|pinia|vue)[\\/]/.test(id)) {
            return 'vue'
          }
          return 'vendor'
        },
      },
    },
  },
  plugins: [
    mdiWoff2Only(),
    injectHtmlVersion(),
    Vue({
      template: { transformAssetUrls },
    }),
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Fonts({
      fontsource: {
        families: [
          {
            name: 'Roboto Mono',
            weights: [400, 700],
          },
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
    UnoCSS(),
  ],
  define: {
    'process.env': {},
    '__APP_VERSION__': JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
})
