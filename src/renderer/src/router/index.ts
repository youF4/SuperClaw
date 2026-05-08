import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Home.vue'),
      children: [
        { path: '', redirect: '/chat' },
        { path: 'chat', name: 'chat', component: () => import('@/views/Chat.vue') },
        { path: 'channels', component: () => import('@/views/Channels.vue') },
        { path: 'models', component: () => import('@/views/Models.vue') },
        { path: 'skills', component: () => import('@/views/Skills.vue') },
        { path: 'cron', component: () => import('@/views/Cron.vue') },
        { path: 'agents', component: () => import('@/views/Agents.vue') },
        { path: 'memory', component: () => import('@/views/Memory.vue') },
        { path: 'devices', component: () => import('@/views/Devices.vue') },
        { path: 'tools', component: () => import('@/views/Tools.vue') },
        { path: 'environments', component: () => import('@/views/Environments.vue') },
        { path: 'artifacts', component: () => import('@/views/Artifacts.vue') },
        { path: 'voice', component: () => import('@/views/Voice.vue') },
        { path: 'approvals', component: () => import('@/views/Approvals.vue') },
        { path: 'secrets', component: () => import('@/views/Secrets.vue') },
        { path: 'diagnostics', component: () => import('@/views/Diagnostics.vue') },
        { path: 'push', component: () => import('@/views/PushNotifications.vue') },
        { path: 'settings', component: () => import('@/views/Settings.vue') }
      ]
    }
  ]
})

export default router
