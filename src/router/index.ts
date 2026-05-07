import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // Tauri 使用自定义协议，不支持 HTML5 History API，必须使用 hash 模式
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Home.vue'),
      children: [
        {
          path: '',
          redirect: '/chat',
        },
        {
          path: 'chat',
          name: 'chat',
          component: () => import('@/views/Chat.vue'),
        },
        {
          path: 'channels',
          name: 'channels',
          component: () => import('@/views/Channels.vue'),
        },
        {
          path: 'models',
          name: 'models',
          component: () => import('@/views/Models.vue'),
        },
        {
          path: 'skills',
          name: 'skills',
          component: () => import('@/views/Skills.vue'),
        },
        {
          path: 'cron',
          name: 'cron',
          component: () => import('@/views/Cron.vue'),
        },
        {
          path: 'agents',
          name: 'agents',
          component: () => import('@/views/Agents.vue'),
        },
        {
          path: 'memory',
          name: 'memory',
          component: () => import('@/views/Memory.vue'),
        },
        {
          path: 'devices',
          name: 'devices',
          component: () => import('@/views/Devices.vue'),
        },
        {
          path: 'tools',
          name: 'tools',
          component: () => import('@/views/Tools.vue'),
        },
        {
          path: 'environments',
          name: 'environments',
          component: () => import('@/views/Environments.vue'),
        },
        {
          path: 'artifacts',
          name: 'artifacts',
          component: () => import('@/views/Artifacts.vue'),
        },
        {
          path: 'voice',
          name: 'voice',
          component: () => import('@/views/Voice.vue'),
        },
        {
          path: 'approvals',
          name: 'approvals',
          component: () => import('@/views/Approvals.vue'),
        },
        {
          path: 'secrets',
          name: 'secrets',
          component: () => import('@/views/Secrets.vue'),
        },
        {
          path: 'diagnostics',
          name: 'diagnostics',
          component: () => import('@/views/Diagnostics.vue'),
        },
        {
          path: 'push',
          name: 'push',
          component: () => import('@/views/PushNotifications.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/Settings.vue'),
        },
      ],
    },
  ],
})

export default router
