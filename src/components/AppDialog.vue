<script setup lang="ts">
/**
 * 通用对话框组件
 * 消除所有页面中重复的 dialog-overlay / dialog HTML 和 CSS
 */
defineProps<{
  show: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-overlay" @click.self="emit('close')">
      <div class="dialog">
        <h3>{{ title }}</h3>
        <slot />
        <div class="dialog-actions">
          <button class="cancel-btn" @click="emit('close')">取消</button>
          <button class="confirm-btn" @click="emit('close')">
            <slot name="confirm-text">确认</slot>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #1a1a2e;
  padding: 24px;
  border-radius: 12px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog h3 {
  margin: 0 0 20px 0;
  color: #fff;
  font-size: 18px;
}

:deep(.form-group) {
  margin-bottom: 16px;
}

:deep(.form-group label) {
  display: block;
  margin-bottom: 8px;
  color: #a0a0c0;
  font-size: 14px;
}

:deep(.form-group input),
:deep(.form-group textarea) {
  width: 100%;
  padding: 10px 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  box-sizing: border-box;
}

:deep(.form-group textarea) {
  resize: vertical;
  min-height: 80px;
}

:deep(.form-group input:focus),
:deep(.form-group textarea:focus) {
  outline: none;
  border-color: #4a4a8e;
}

:deep(.hint) {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #666;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: #2a2a4e;
  color: #a0a0c0;
}

.confirm-btn {
  background: #4a4a8e;
  color: #fff;
}

.confirm-btn:hover {
  background: #5a5aae;
}
</style>
