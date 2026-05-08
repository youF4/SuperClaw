/** 上传文件附件 */
export interface FileAttachment {
  id: string
  name: string
  type: 'image' | 'file' | 'audio' | 'video'
  size: number
  path?: string
  url?: string
  preview?: string
}

/** 消息中包含的附件引用 */
export interface MessageAttachment {
  type: 'image' | 'file'
  url: string
  name?: string
}
