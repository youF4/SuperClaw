<script setup lang="ts">
import { ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const props = defineProps<{
  content: string
}>()

// 使用 modern marked API 配置
marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre><code class="hljs language-${lang}">${hljs.highlight(text, { language: lang }).value}</code></pre>`
      }
      return `<pre><code class="hljs">${hljs.highlightAuto(text).value}</code></pre>`
    },
  },
})

// 异步渲染 Markdown 内容
const htmlContent = ref('')

watch(
  () => props.content,
  async (content) => {
    if (!content) {
      htmlContent.value = ''
      return
    }
    try {
      const raw = await marked.parse(content)
      htmlContent.value = DOMPurify.sanitize(raw)
    } catch {
      htmlContent.value = DOMPurify.sanitize(content)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="markdown-content" v-html="htmlContent"></div>
</template>

<style>
.markdown-content {
  line-height: 1.6;
}

.markdown-content pre {
  background: #1e1e3f;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-content code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.markdown-content p code {
  background: #2a2a4e;
  padding: 2px 6px;
  border-radius: 4px;
}

.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #4a4a8e;
  padding: 8px;
  text-align: left;
}

.markdown-content th {
  background: #2a2a4e;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 24px;
}

.markdown-content li {
  margin: 4px 0;
}

.markdown-content a {
  color: #60a5fa;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.markdown-content blockquote {
  border-left: 4px solid #4a4a8e;
  padding-left: 12px;
  margin: 8px 0;
  color: #a0a0c0;
}
</style>
