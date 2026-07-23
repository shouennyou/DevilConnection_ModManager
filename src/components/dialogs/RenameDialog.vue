<template>
  <v-dialog v-model="dialogVisible" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-h6 font-weight-bold">
        {{ title }}
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="inputValue"
          autofocus
          density="compact"
          hide-details="auto"
          :label="label"
          :placeholder="placeholder"
          variant="outlined"
          @keyup.enter="handleConfirm"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn variant="text" @click="handleCancel">
          取消
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!inputValue.trim()"
          variant="flat"
          @click="handleConfirm"
        >
          确认
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref } from 'vue'

  const dialogVisible = ref(false)
  const inputValue = ref('')

  const title = ref('重命名')
  const label = ref('名称')
  const placeholder = ref('')

  let resolvePromise: ((value: string | null) => void) | null = null

  function open (options: {
    title?: string
    label?: string
    placeholder?: string
    initialValue?: string
  }): Promise<string | null> {
    title.value = options.title ?? '重命名'
    label.value = options.label ?? '名称'
    placeholder.value = options.placeholder ?? ''
    inputValue.value = options.initialValue ?? ''
    dialogVisible.value = true
    return new Promise(resolve => {
      resolvePromise = resolve
    })
  }

  function handleConfirm () {
    if (!inputValue.value.trim()) return
    dialogVisible.value = false
    const value = inputValue.value.trim()
    inputValue.value = ''
    resolvePromise?.(value)
    resolvePromise = null
  }

  function handleCancel () {
    dialogVisible.value = false
    inputValue.value = ''
    resolvePromise?.(null)
    resolvePromise = null
  }

  defineExpose({ open })
</script>
