<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useGatewayStore } from '@/stores/gateway'
import { useRealtimeChat } from '@/composables/useRealtimeChat'

const gatewayStore = useGatewayStore()
const { connectWs } = useRealtimeChat()

// 应用启动时检查 Gateway 状态并连接 WebSocket
onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await connectWs()
  }
})

// 页面关闭时断开 WebSocket
onUnmounted(() => {
  // gatewayWs.disconnect() 由 useRealtimeChat 的 watch 自动处理
})
</script>

<template>
  <RouterView />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
