<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'

const gatewayStore = useGatewayStore()

interface Tool {
  name: string
  description: string
  category: string
  risk: 'low' | 'medium' | 'high'
  inputSchema?: Record<string, unknown>
}

interface Command {
  name: string
  args?: string
  aliases?: string[]
  description: string
  scope?: string
}

const tools = ref<Tool[]>([])
const commands = ref<Command[]>([])
const loading = ref(false)
const searchQuery = ref('')
const activeTab = ref<'tools' | 'commands'>('tools')

const filteredTools = computed(() => {
  if (!searchQuery.value.trim()) return tools.value
  const q = searchQuery.value.toLowerCase()
  return tools.value.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
})

const groupedTools = computed(() => {
  const groups: Record<string, Tool[]> = {}
  for (const tool of filteredTools.value) {
    const cat = tool.category || '未分类'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(tool)
  }
  return groups
})

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadTools()
    await loadCommands()
  }
})

async function loadTools() {
  loading.value = true
  const res = await gatewayApi.tools.catalog()
  if (res.ok && res.result) {
    const data = res.result as { tools?: Tool[] }
    tools.value = data.tools || []
  }
  loading.value = false
}

async function loadCommands() {
  const res = await gatewayApi.commands.list()
  if (res.ok && res.result) {
    commands.value = (res.result as Command[]) || []
  }
}

function riskLabel(r: string): string {
  return { low: '低风险', medium: '中风险', high: '高风险' }[r] || r
}
</script>

<template>
  <div class="tools-page">
    <div class="page-header">
      <h2>工具箱</h2>
      <p>浏览可用的工具和命令</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取工具列表</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <!-- 标签 -->
      <div class="tabs">
        <button :class="{ active: activeTab === 'tools' }" @click="activeTab = 'tools'">
          工具目录
        </button>
        <button :class="{ active: activeTab === 'commands' }" @click="activeTab = 'commands'">
          斜杠命令
        </button>
      </div>

      <!-- 工具目录 -->
      <div v-if="activeTab === 'tools'" class="tab-content">
        <div class="search-box">
          <input v-model="searchQuery" type="text" placeholder="搜索工具..." />
        </div>

        <div v-if="loading" class="loading">加载中...</div>

        <div v-else-if="Object.keys(groupedTools).length === 0" class="empty">
          <p>{{ searchQuery ? '无匹配工具' : '暂无可用工具' }}</p>
        </div>

        <div v-else class="tool-groups">
          <div v-for="(groupTools, category) in groupedTools" :key="category" class="tool-group">
            <h3 class="group-title">{{ category }}</h3>
            <div class="tools-grid">
              <div v-for="tool in groupTools" :key="tool.name" class="tool-card">
                <div class="tool-header">
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="risk-badge" :class="tool.risk">{{ riskLabel(tool.risk) }}</span>
                </div>
                <p class="tool-desc">{{ tool.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 斜杠命令 -->
      <div v-if="activeTab === 'commands'" class="tab-content">
        <div v-if="commands.length === 0" class="empty">
          <p>暂无可用命令</p>
        </div>
        <div v-else class="commands-list">
          <div v-for="cmd in commands" :key="cmd.name" class="command-item">
            <div class="command-header">
              <code class="command-name">/{{ cmd.name }}</code>
              <span v-if="cmd.scope" class="command-scope">{{ cmd.scope }}</span>
            </div>
            <p class="command-desc">{{ cmd.description }}</p>
            <div v-if="cmd.aliases && cmd.aliases.length" class="command-aliases">
              <span class="alias-label">别名：</span>
              <code v-for="a in cmd.aliases" :key="a" class="alias-tag">{{ a }}</code>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tools-page { padding: 24px; max-width: 1200px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #fff; }
.page-header p { margin: 0; color: #888; }

.gateway-warning {
  background: #2a2a4e; padding: 16px; border-radius: 8px; margin-bottom: 24px;
  display: flex; align-items: center; gap: 16px;
}
.gateway-warning p { color: #fbbf24; margin: 0; }
.gateway-warning button { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }

.tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.tabs button {
  padding: 10px 20px; background: #1a1a2e; border: 1px solid #2a2a4e;
  border-radius: 8px; color: #a0a0c0; cursor: pointer; font-size: 14px;
}
.tabs button.active { background: #4a4a8e; color: #fff; border-color: #4a4a8e; }

.search-box { margin-bottom: 20px; }
.search-box input {
  width: 100%; padding: 12px 16px; background: #1a1a2e; border: 1px solid #2a2a4e;
  border-radius: 8px; color: #fff; font-size: 14px; box-sizing: border-box;
}
.search-box input:focus { outline: none; border-color: #4a4a8e; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }

.tool-group { margin-bottom: 32px; }
.group-title { margin: 0 0 12px; font-size: 16px; color: #a0a0c0; text-transform: uppercase; letter-spacing: 1px; }
.tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }

.tool-card {
  background: #1a1a2e; padding: 16px; border-radius: 10px; border: 1px solid #2a2a4e;
}
.tool-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.tool-name { font-family: Consolas, monospace; font-size: 13px; color: #60a5fa; }
.risk-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.risk-badge.low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.risk-badge.medium { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.risk-badge.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.tool-desc { color: #a0a0c0; font-size: 13px; margin: 0; line-height: 1.5; }

.commands-list { display: flex; flex-direction: column; gap: 8px; }
.command-item {
  background: #1a1a2e; padding: 16px; border-radius: 8px; border: 1px solid #2a2a4e;
}
.command-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.command-name { font-size: 14px; color: #60a5fa; background: #0f0f1a; padding: 4px 8px; border-radius: 4px; }
.command-scope { font-size: 11px; color: #888; background: #2a2a4e; padding: 2px 8px; border-radius: 4px; }
.command-desc { color: #e0e0e0; font-size: 14px; margin: 0 0 8px; line-height: 1.5; }
.command-aliases { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.alias-label { font-size: 12px; color: #888; }
.alias-tag { font-size: 12px; color: #a0a0c0; background: #2a2a4e; padding: 2px 6px; border-radius: 4px; }
</style>
