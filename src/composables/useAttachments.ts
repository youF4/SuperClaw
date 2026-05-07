import { ref } from 'vue'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { FileAttachment as Attachment } from '@/lib/types'
import { formatSize } from '@/lib/utils'

export function useAttachments() {
  const attachments = ref<Attachment[]>([])

  // 选择文件
  async function selectFile() {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'All Files',
            extensions: ['*'],
          },
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
          },
          {
            name: 'Documents',
            extensions: ['pdf', 'doc', 'docx', 'txt', 'md'],
          },
        ],
      })

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected]
        for (const filePath of files) {
          await addFile(filePath)
        }
      }
    } catch (error) {
      console.error('Failed to select file:', error)
    }
  }

  // 添加文件
  async function addFile(filePath: string) {
    const fileName = filePath.split(/[/\\]/).pop() || 'file'
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    // 判断文件类型
    let type: Attachment['type'] = 'file'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
      type = 'image'
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      type = 'audio'
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
      type = 'video'
    }

    // 获取文件大小
    let size = 0
    try {
      const metadata = await invoke<{ size: number }>('get_file_metadata', { path: filePath })
      size = metadata.size
    } catch {
      size = 0
    }

    const attachment: Attachment = {
      id: `attach-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: fileName,
      type,
      size,
      path: filePath,
    }

    // 如果是图片，生成预览
    if (type === 'image') {
      try {
        attachment.url = convertFileSrc(filePath)
        attachment.preview = attachment.url
      } catch {
        attachment.url = `file://${filePath}`
      }
    }

    attachments.value.push(attachment)
  }

  // 移除附件
  function removeAttachment(id: string) {
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  // 清空所有附件
  function clearAttachments() {
    attachments.value = []
  }

  return {
    attachments,
    selectFile,
    addFile,
    removeAttachment,
    clearAttachments,
    formatSize,
  }
}
