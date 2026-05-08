import { ref } from 'vue'
import type { FileAttachment as Attachment } from '@/lib/types'
import { formatSize } from '@/lib/utils'

export function useAttachments() {
  const attachments = ref<Attachment[]>([])

  async function selectFile() {
    const result = await (window as any).electronAPI?.dialog.open({
      properties: ['multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
      ]
    })
    if (result) {
      const files = Array.isArray(result) ? result : [result]
      for (const filePath of files) {
        await addFile(filePath)
      }
    }
  }

  async function addFile(filePath: string) {
    const fileName = filePath.split(/[/\\]/).pop() || 'file'
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    let type: Attachment['type'] = 'file'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) type = 'image'
    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'audio'
    else if (['mp4', 'webm', 'mov'].includes(ext)) type = 'video'

    let size = 0
    try {
      size = await window.electronAPI.getFileMetadata(filePath)
    } catch { size = 0 }

    const attachment: Attachment = {
      id: `attach-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: fileName,
      type,
      size,
      path: filePath
    }

    if (type === 'image') {
      attachment.url = `file://${filePath}`
      attachment.preview = attachment.url
    }

    attachments.value.push(attachment)
  }

  function removeAttachment(id: string) {
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  function clearAttachments() {
    attachments.value = []
  }

  return { attachments, selectFile, addFile, removeAttachment, clearAttachments, formatSize }
}
