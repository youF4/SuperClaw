<script setup lang="ts">
import { onMounted } from 'vue'
import { useChannelStore } from '@/stores/channel'
import { useGatewayStore } from '@/stores/gateway'

const channelStore = useChannelStore()
const gatewayStore = useGatewayStore()

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await channelStore.fetchChannels()
  }
})

const channelTypes = [
  { type: 'telegram', name: 'Telegram', icon: '📱' },
  { type: 'discord', name: 'Discord', icon: '🎮' },
  { type: 'qqbot', name: 'QQ机器人', icon: '💬' },
  { type: 'feishu', name: '飞书', icon: '🏢' },
  { type: 'whatsapp', name: 'WhatsApp', icon: '📲' },
  { type: 'signal', name: 'Signal', icon: '🔒' },
  { type: 'slack', name: 'Slack', icon: '💼' },
  { type: 'imessage', name: 'iMessage', icon: '🍎' },
]
</script>

<template>
  <div class="channels-page">
    <div class="page-header">
      <h2>通道管理</h2>
      <p>配置和管理消息通道</p>
    </div>

    <!-- Gateway 状态提示 -->
    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取通道状态</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <!-- 通道列表 -->
    <div class="channels-grid">
      <div
        v-for="channelType in channelTypes"
        :key="channelType.type"
        class="channel-card"
      >
        <div class="channel-icon">{{ channelType.icon }}</div>
        <div class="channel-info">
          <h3>{{ channelType.name }}</h3>
          <p class="channel-type">{{ channelType.type }}</p>
        </div>
        <div class="channel-status">
          <span
            v-for="channel in channelStore.channels.filter(c => c.type === channelType.type)"
            :key="channel.id"
            class="status-badge"
            :class="channel.status"
          >
            {{ channel.status === 'online' ? '在线' : channel.status === 'error' ? '错误' : '离线' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 已配置的通道 -->
    <div class="configured-channels" v-if="channelStore.channels.length > 0">
      <h3>已配置的通道</h3>
      <div class="channel-list">
        <div
          v-for="channel in channelStore.channels"
          :key="channel.id"
          class="channel-item"
        >
          <div class="channel-name">{{ channel.name || channel.id }}</div>
          <div class="channel-actions">
            <button
              v-if="channel.enabled"
              @click="channelStore.stopChannel(channel.id)"
              class="stop-btn"
            >
              停止
            </button>
            <button
              v-else
              @click="channelStore.startChannel(channel.id)"
              class="start-btn"
            >
              启动
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.channels-page {
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

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.channel-card {
  background: #1a1a2e;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.channel-icon {
  font-size: 32px;
}

.channel-info h3 {
  margin: 0;
  font-size: 14px;
  color: #fff;
}

.channel-type {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #888;
}

.channel-status {
  margin-left: auto;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-badge.online {
  background: #22c55e;
  color: #fff;
}

.status-badge.offline {
  background: #6b7280;
  color: #fff;
}

.status-badge.error {
  background: #ef4444;
  color: #fff;
}

.configured-channels h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #fff;
}

.channel-list {
  background: #1a1a2e;
  border-radius: 12px;
}

.channel-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #2a2a4e;
}

.channel-item:last-child {
  border-bottom: none;
}

.channel-name {
  font-size: 14px;
  color: #fff;
}

.channel-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.channel-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.start-btn {
  background: #22c55e;
}

.stop-btn {
  background: #ef4444;
}
</style>