<script setup lang="ts">
import type { FileAttachment as Attachment } from '@/lib/types'
import { formatSize } from '@/lib/utils'

defineProps<{
  attachment: Attachment
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

function getFileIcon(type: string): string {
  switch (type) {
    case 'image':
      return '🖼️'
    case 'audio':
      return '🎵'
    case 'video':
      return '🎬'
    default:
      return '📄'
  }
}
</script>

<template>
  <div class="attachment-item">
    <!-- 图片预览 -->
    <div v-if="attachment.type === 'image' && attachment.preview" class="image-preview">
      <img :src="attachment.preview" :alt="attachment.name" />
      <button class="remove-btn" @click="emit('remove', attachment.id)">×</button>
    </div>

    <!-- 其他文件 -->
    <div v-else class="file-preview">
      <span class="file-icon">{{ getFileIcon(attachment.type) }}</span>
      <div class="file-info">
        <span class="file-name">{{ attachment.name }}</span>
        <span class="file-size">{{ formatSize(attachment.size) }}</span>
      </div>
      <button class="remove-btn" @click="emit('remove', attachment.id)">×</button>
    </div>
  </div>
</template>

<style scoped>
.attachment-item {
  position: relative;
}

.image-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #2a2a4e;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  border-radius: 8px;
  min-width: 200px;
}

.file-icon {
  font-size: 24px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 13px;
  color: #fff;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: #888;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
}

.attachment-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: #ef4444;
}
</style>
