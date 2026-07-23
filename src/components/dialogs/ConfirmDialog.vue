<template>
  <v-dialog v-model="dialogVisible" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-h6 font-weight-bold">
        {{ title }}
      </v-card-title>

      <v-card-text class="multiline-text">
        {{ message }}
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn v-if="!hideCancel" variant="text" @click="handleCancel">
          {{ cancelText }}
        </v-btn>

        <v-btn
          :color="confirmColor"
          variant="flat"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref } from 'vue'

  const dialogVisible = ref(false)

  const title = ref('提示')
  const message = ref('')
  const confirmText = ref('确认')
  const cancelText = ref('取消')
  const confirmColor = ref('primary')
  const hideCancel = ref(false)

  let resolvePromise: ((value: boolean) => void) | null = null

  function open (options: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    confirmColor?: string
    hideCancel?: boolean
  }): Promise<boolean> {
    title.value = options.title ?? '提示'
    message.value = options.message
    confirmText.value = options.confirmText ?? '确认'
    cancelText.value = options.cancelText ?? '取消'
    confirmColor.value = options.confirmColor ?? 'primary'
    hideCancel.value = options.hideCancel ?? false
    dialogVisible.value = true
    return new Promise(resolve => {
      resolvePromise = resolve
    })
  }

  function handleConfirm () {
    dialogVisible.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel () {
    dialogVisible.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  defineExpose({ open })
</script>
