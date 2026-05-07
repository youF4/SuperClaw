<script setup lang="ts">
import NotificationCenter from '@/components/NotificationCenter.vue'

const menuItems = [
  { path: '/chat', label: '聊天', icon: '💬' },
  { path: '/channels', label: '通道', icon: '📡' },
  { path: '/models', label: '模型', icon: '🤖' },
  { path: '/memory', label: '记忆管理', icon: '🧠' },
  { path: '/tools', label: '工具箱', icon: '🔧' },
  { path: '/agents', label: '智能体', icon: '🎭' },
  { path: '/skills', label: '技能', icon: '⚡' },
  { path: '/cron', label: '定时任务', icon: '⏰' },
  { path: '/artifacts', label: '工件管理', icon: '📦' },
  { path: '/devices', label: '设备管理', icon: '📱' },
  { path: '/environments', label: '环境节点', icon: '🖥️' },
  { path: '/voice', label: '语音/TTS', icon: '🔊' },
  { path: '/approvals', label: '审批中心', icon: '✅' },
  { path: '/secrets', label: '密钥管理', icon: '🔐' },
  { path: '/diagnostics', label: '系统诊断', icon: '🏥' },
  { path: '/push', label: '推送通知', icon: '🔔' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <h1>SuperClaw</h1>
      </div>
      <nav class="menu">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu-item"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
  <NotificationCenter />
</template>

<style scoped>
.layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar {
  width: 200px;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 20px;
  border-bottom: 1px solid #2a2a4e;
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
}

.menu {
  flex: 1;
  padding: 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: #a0a0c0;
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.menu-item:hover {
  background: #2a2a4e;
  color: #fff;
}

.menu-item.router-link-active {
  background: #4a4a8e;
  color: #fff;
}

.icon {
  font-size: 18px;
}

.label {
  font-size: 14px;
}

.content {
  flex: 1;
  background: #0f0f1a;
  color: #fff;
  overflow: auto;
}
</style>
