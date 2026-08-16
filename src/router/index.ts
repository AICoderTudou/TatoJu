import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/Projects.vue') },
    { path: '/works', name: 'works', component: () => import('../views/MyWorks.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/Settings.vue') },
    {
      path: '/p/:projectId',
      component: () => import('../views/Workspace.vue'),
      children: [
        { path: '', name: 'overview', component: () => import('../views/Overview.vue') },
        { path: 'script', name: 'script', component: () => import('../views/Script.vue') },
        { path: 'assets', name: 'assets', component: () => import('../views/Assets.vue') },
        { path: 'storyboard', name: 'storyboard', component: () => import('../views/Storyboard.vue') },
        { path: 'clips', name: 'clips', component: () => import('../views/Clips.vue') },
        { path: 'resources', name: 'resources', component: () => import('../views/ResourceCenter.vue') }
      ]
    }
  ]
})
