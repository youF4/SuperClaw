<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSkillStore } from '@/stores/skill'
import { useGatewayStore } from '@/stores/gateway'

const skillStore = useSkillStore()
const gatewayStore = useGatewayStore()

const searchQuery = ref('')
const activeTab = ref<'installed' | 'market'>('installed')

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await skillStore.fetchInstalledSkills()
  }
})

async function search() {
  if (!searchQuery.value.trim()) return
  await skillStore.searchSkills(searchQuery.value.trim())
}

async function installSkill(skillId: string) {
  await skillStore.installSkill(skillId)
}

async function updateSkill(skillId: string) {
  await skillStore.updateSkill(skillId)
}

async function uninstallSkill(skillId: string) {
  if (!confirm('确定要卸载此技能吗？')) return
  await skillStore.uninstallSkill(skillId)
}

function switchTab(tab: 'installed' | 'market') {
  activeTab.value = tab
  if (tab === 'installed') {
    skillStore.fetchInstalledSkills()
  }
}
</script>

<template>
  <div class="skills-page">
    <div class="page-header">
      <h2>技能管理</h2>
      <p>安装和管理 AI 技能，扩展 OpenClaw 能力</p>
    </div>

    <!-- Gateway 状态提示 -->
    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取技能状态</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <!-- 标签切换 -->
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'installed' }"
        @click="switchTab('installed')"
      >
        已安装 ({{ skillStore.installedSkills.length }})
      </button>
      <button
        :class="{ active: activeTab === 'market' }"
        @click="switchTab('market')"
      >
        技能市场
      </button>
    </div>

    <!-- 已安装技能 -->
    <div v-if="activeTab === 'installed'" class="skills-section">
      <div v-if="skillStore.loading" class="loading">加载中...</div>
      
      <div v-else-if="skillStore.installedSkills.length === 0" class="empty">
        <p>暂无已安装的技能</p>
        <button @click="switchTab('market')">去技能市场看看</button>
      </div>

      <div v-else class="skills-grid">
        <div
          v-for="skill in skillStore.installedSkills"
          :key="skill.id"
          class="skill-card"
        >
          <div class="skill-header">
            <h3>{{ skill.name }}</h3>
            <span class="skill-version">v{{ skill.version }}</span>
          </div>
          <p class="skill-description">{{ skill.description }}</p>
          <div class="skill-footer">
            <span class="skill-author" v-if="skill.author">
              作者: {{ skill.author }}
            </span>
              <div class="skill-actions">
                <button @click="updateSkill(skill.id)" class="update-btn">
                  更新
                </button>
                <button @click="uninstallSkill(skill.id)" class="uninstall-btn">
                  卸载
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 技能市场 -->
    <div v-if="activeTab === 'market'" class="skills-section">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索技能..."
          @keyup.enter="search"
        />
        <button @click="search" :disabled="skillStore.searching">
          {{ skillStore.searching ? '搜索中...' : '搜索' }}
        </button>
      </div>

      <!-- 搜索结果 -->
      <div v-if="skillStore.skills.length > 0" class="skills-grid">
        <div
          v-for="skill in skillStore.skills"
          :key="skill.id"
          class="skill-card"
        >
          <div class="skill-header">
            <h3>{{ skill.name }}</h3>
            <span class="skill-version">v{{ skill.version }}</span>
          </div>
          <p class="skill-description">{{ skill.description }}</p>
          <div class="skill-footer">
            <span class="skill-author" v-if="skill.author">
              作者: {{ skill.author }}
            </span>
            <div class="skill-actions">
              <button
                v-if="!skill.installed"
                @click="installSkill(skill.id)"
                class="install-btn"
              >
                安装
              </button>
              <span v-else class="installed-badge">已安装</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty">
        <p>输入关键词搜索技能</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skills-page {
  padding: 24px;
  max-width: 1200px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #fff;
}

.page-header p {
  margin: 0;
  color: #888;
}

.gateway-warning {
  background: #2a2a4e;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.gateway-warning p {
  color: #fbbf24;
}

.gateway-warning button {
  padding: 8px 16px;
  background: #4a4a8e;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tabs button {
  padding: 10px 20px;
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  border-radius: 8px;
  color: #a0a0c0;
  cursor: pointer;
  font-size: 14px;
}

.tabs button.active {
  background: #4a4a8e;
  color: #fff;
  border-color: #4a4a8e;
}

.skills-section {
  min-height: 400px;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty button {
  margin-top: 16px;
  padding: 10px 20px;
  background: #4a4a8e;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box input {
  flex: 1;
  padding: 12px 16px;
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
  border-color: #4a4a8e;
}

.search-box button {
  padding: 12px 24px;
  background: #4a4a8e;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.search-box button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.skill-card {
  background: #1a1a2e;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #2a2a4e;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.skill-header h3 {
  margin: 0;
  font-size: 16px;
  color: #fff;
}

.skill-version {
  font-size: 12px;
  color: #888;
  background: #2a2a4e;
  padding: 4px 8px;
  border-radius: 4px;
}

.skill-description {
  color: #a0a0c0;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.skill-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-author {
  font-size: 12px;
  color: #666;
}

.skill-actions {
  display: flex;
  gap: 8px;
}

.install-btn,
.update-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.install-btn {
  background: #22c55e;
  color: #fff;
}

.update-btn {
  background: #3b82f6;
  color: #fff;
}

.uninstall-btn {
  background: #ef4444;
  color: #fff;
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.installed-badge {
  font-size: 12px;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
}
</style>
