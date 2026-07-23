<template>
  <v-dialog v-model="dialogVisible" max-width="720" persistent scrollable>
    <v-card class="mod-config-card">
      <v-card-text class="config-dialog-content">
        <header class="config-dialog-heading">
          <h2 class="config-dialog-title">
            {{ title }}
          </h2>

          <p v-if="description" class="config-dialog-description text-body-2 text-medium-emphasis">
            {{ description }}
          </p>
        </header>

        <v-divider class="config-heading-divider" />

        <div v-if="fields.length === 0" class="text-body-2 text-medium-emphasis">
          此模组未声明可配置项.
        </div>

        <div v-else class="config-fields">
          <div v-for="field in fields" :key="field.key" class="config-field">
            <div v-if="field.type !== 'toggle'" class="config-input-heading">
              <div class="config-field-label">
                {{ field.label }}<span v-if="field.required" class="required-marker">*</span>
              </div>

              <div v-if="field.help" class="config-field-help text-caption text-medium-emphasis">
                {{ field.help }}
              </div>
            </div>

            <v-text-field
              v-if="field.type === 'text' || field.type === 'password'"
              :aria-label="field.label"
              density="comfortable"
              :error-messages="errorMessages(field.key)"
              hide-details="auto"
              :model-value="textValue(field.key)"
              :placeholder="field.placeholder"
              :type="field.type"
              variant="outlined"
              @update:model-value="setTextValue(field.key, $event)"
            />

            <v-text-field
              v-else-if="field.type === 'number'"
              :aria-label="field.label"
              density="comfortable"
              :error-messages="errorMessages(field.key)"
              hide-details="auto"
              :model-value="textValue(field.key)"
              :placeholder="field.placeholder"
              type="number"
              variant="outlined"
              @update:model-value="setNumberValue(field.key, $event)"
            />

            <div
              v-else-if="field.type === 'toggle'"
              class="config-toggle-field"
            >
              <div class="config-toggle-row">
                <div>
                  <div class="config-field-label">
                    {{ field.label }}<span v-if="field.required" class="required-marker">*</span>
                  </div>

                  <div v-if="field.help" class="config-field-help text-caption text-medium-emphasis">
                    {{ field.help }}
                  </div>
                </div>

                <v-switch
                  class="config-toggle-control"
                  color="primary"
                  hide-details
                  inset
                  :model-value="values[field.key] === true"
                  @update:model-value="setToggleValue(field.key, $event)"
                />
              </div>

              <v-messages
                v-if="errorMessages(field.key).length > 0"
                color="error"
                :messages="errorMessages(field.key)"
              />
            </div>

            <v-select
              v-else
              :aria-label="field.label"
              density="comfortable"
              :error-messages="errorMessages(field.key)"
              hide-details="auto"
              item-title="label"
              item-value="value"
              :items="field.options ?? []"
              :model-value="values[field.key]"
              :placeholder="field.placeholder"
              variant="outlined"
              @update:model-value="setSelectValue(field.key, $event)"
            />
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-4 py-3">
        <v-spacer />

        <v-btn variant="text" @click="handleCancel">
          取消
        </v-btn>

        <v-btn color="primary" variant="flat" @click="handleSave">
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { ModConfigDefinition, ModConfigField, ModConfigValue } from '@/types/mod'
  import { ref } from 'vue'

  const dialogVisible = ref(false)
  const title = ref('模组配置')
  const description = ref('')
  const fields = ref<ModConfigField[]>([])
  const values = ref<Record<string, ModConfigValue>>({})
  const fieldErrors = ref<Record<string, string>>({})

  let resolvePromise: ((value: Record<string, ModConfigValue> | null) => void) | null = null

  function isConfigValue (value: unknown): value is ModConfigValue {
    return typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
  }

  function open (definition: ModConfigDefinition, savedValues: Record<string, ModConfigValue>): Promise<Record<string, ModConfigValue> | null> {
    title.value = definition.title
    description.value = definition.description
    fields.value = definition.fields
    values.value = Object.fromEntries(definition.fields.map(field => [
      field.key,
      isConfigValue(savedValues[field.key]) ? savedValues[field.key] : field.default,
    ]))
    fieldErrors.value = {}
    dialogVisible.value = true
    return new Promise(resolve => {
      resolvePromise = resolve
    })
  }

  function textValue (key: string): string {
    const value = values.value[key]
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  function errorMessages (key: string): string[] {
    const message = fieldErrors.value[key]
    return message ? [message] : []
  }

  function setTextValue (key: string, value: unknown): void {
    values.value[key] = typeof value === 'string' ? value : ''
  }

  function setNumberValue (key: string, value: unknown): void {
    const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
    values.value[key] = text === '' ? '' : Number(text)
  }

  function setToggleValue (key: string, value: unknown): void {
    values.value[key] = value === true
  }

  function setSelectValue (key: string, value: unknown): void {
    if (isConfigValue(value)) values.value[key] = value
  }

  function isEmpty (value: ModConfigValue): boolean {
    return typeof value === 'string' && value.trim() === ''
  }

  function validate (): boolean {
    const errors: Record<string, string> = {}
    for (const field of fields.value) {
      const value = values.value[field.key]
      if (field.required && isEmpty(value)) {
        errors[field.key] = '此项为必填项'
      } else if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
        errors[field.key] = '请输入有效数字'
      }
    }
    fieldErrors.value = errors
    return Object.keys(errors).length === 0
  }

  function close (result: Record<string, ModConfigValue> | null): void {
    dialogVisible.value = false
    resolvePromise?.(result)
    resolvePromise = null
  }

  function handleSave (): void {
    if (!validate()) return
    const result = Object.fromEntries(fields.value.map(field => [field.key, values.value[field.key]]))
    close(result)
  }

  function handleCancel (): void {
    close(null)
  }

  defineExpose({ open })
</script>

<style scoped>
  .mod-config-card {
    display: flex;
    flex-direction: column;
    max-height: 82vh;
  }

  .config-dialog-content {
    max-height: min(70vh, 600px);
    padding: 24px;
    overflow-y: auto;
  }

  .config-dialog-heading {
    padding: 4px 0;
  }

  .config-dialog-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.4;
  }

  .config-dialog-description {
    margin: 12px 0 0;
    line-height: 1.65;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .config-heading-divider {
    margin: 20px 0;
  }

  .config-fields {
    display: flex;
    flex-direction: column;
  }

  .config-field {
    padding: 4px 0;
  }

  .config-field + .config-field {
    margin-top: 20px;
    padding-top: 24px;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .config-field-help {
    margin-top: 4px;
    line-height: 1.45;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .config-input-heading {
    margin-bottom: 8px;
  }

  .config-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 48px;
  }

  .config-toggle-control {
    flex: 0 0 auto;
  }

  .config-field-label {
    font-size: 1rem;
    line-height: 1.4;
  }

  .required-marker {
    margin-left: 4px;
    color: rgb(var(--v-theme-error));
    font-weight: 700;
  }
</style>
