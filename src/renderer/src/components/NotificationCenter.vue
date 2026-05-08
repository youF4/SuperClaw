<script setup lang="ts">
import { useNotification } from '@/composables/useNotification'

const { notifications, dismiss } = useNotification()
</script>

<template>
  <Teleport to="body">
    <div class="notification-center">
      <TransitionGroup name="notif">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="notification"
          :class="notif.type"
          @click="dismiss(notif.id)"
        >
          <span class="notif-icon">
            {{ notif.type === 'error' ? '✕' : notif.type === 'success' ? '✓' : 'ℹ' }}
          </span>
          <span class="notif-message">{{ notif.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-center {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.notification {
  pointer-events: auto;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 280px;
  max-width: 420px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  font-size: 14px;
}

.notification.error {
  background: #7f1d1d;
  color: #fca5a5;
  border: 1px solid #991b1b;
}

.notification.success {
  background: #14532d;
  color: #86efac;
  border: 1px solid #166534;
}

.notification.info {
  background: #1e3a5f;
  color: #93c5fd;
  border: 1px solid #1d4e7a;
}

.notif-icon {
  font-weight: bold;
  font-size: 16px;
  flex-shrink: 0;
}

.notif-message {
  flex: 1;
}

.notif-enter-active,
.notif-leave-active {
  transition: all 0.3s ease;
}

.notif-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notif-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
