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
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/Settings.vue'),
        },
      ],
    },
  ],
})

export default router
