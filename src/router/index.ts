import { createRouter, createWebHistory } from 'vue-router'

function getUserRole(): string {
  try {
    const raw = localStorage.getItem('admin_user')
    if (raw) return JSON.parse(raw).role || ''
  } catch { /* ignore */ }
  return ''
}

function isAdmin(): boolean {
  const role = getUserRole()
  return role === 'admin' || role === 'super_admin'
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Unified login (phone for customers, password for admin/chef)
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { noAuth: true },
    },
    // Legacy routes — redirect to unified login
    { path: '/chef/login', redirect: '/login' },
    { path: '/user/login', redirect: '/login' },
    // Root — redirect based on auth state
    {
      path: '/',
      redirect: () => {
        const adminToken = localStorage.getItem('admin_token')
        if (adminToken) {
          try {
            const payload = JSON.parse(atob(adminToken.split('.')[1]))
            const exp = payload.exp * 1000
            if (Date.now() < exp) {
              const role = payload.role || ''
              if (role === 'admin' || role === 'super_admin') return '/dashboard'
              return '/kitchen'
            }
          } catch { /* expired */ }
          localStorage.removeItem('admin_token')
        }
        const userToken = localStorage.getItem('user_token')
        if (userToken) {
          try {
            const payload = JSON.parse(atob(userToken.split('.')[1]))
            if (Date.now() < payload.exp * 1000) return '/user/menu'
          } catch { /* expired */ }
          localStorage.removeItem('user_token')
        }
        return '/login'
      },
    },
    // Admin layout (requires admin role)
    {
      path: '/',
      component: () => import('../views/layout/AppLayout.vue'),
      meta: { requiresAdminAuth: true },
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
        { path: 'dishes', name: 'DishList', component: () => import('../views/dishes/DishList.vue') },
        { path: 'dishes/add', name: 'DishAdd', component: () => import('../views/dishes/DishForm.vue') },
        { path: 'dishes/:id/edit', name: 'DishEdit', component: () => import('../views/dishes/DishForm.vue') },
        { path: 'categories', name: 'CategoryList', component: () => import('../views/categories/CategoryList.vue') },
        { path: 'orders', name: 'AdminOrderList', component: () => import('../views/orders/AdminOrderList.vue') },
        { path: 'users', name: 'UserList', component: () => import('../views/users/UserList.vue') },
        { path: 'profile', name: 'Profile', component: () => import('../views/profile/Profile.vue') },
        { path: '', redirect: '/dashboard' },
      ],
    },
    // Customer layout
    {
      path: '/user',
      component: () => import('../views/layout/UserLayout.vue'),
      children: [
        { path: 'menu', name: 'Menu', component: () => import('../views/menu/Menu.vue'), meta: { requiresUserAuth: true } },
        { path: 'cart', name: 'Cart', component: () => import('../views/cart/Cart.vue'), meta: { requiresUserAuth: true } },
        { path: 'orders', name: 'UserOrderList', component: () => import('../views/orders/UserOrderList.vue'), meta: { requiresUserAuth: true } },
        { path: 'orders/:id', name: 'UserOrderDetail', component: () => import('../views/orders/UserOrderDetail.vue'), meta: { requiresUserAuth: true } },
        { path: '', redirect: '/user/menu' },
      ],
    },
    // Kitchen (standalone, admin or chef)
    {
      path: '/kitchen',
      name: 'Kitchen',
      component: () => import('../views/kitchen/Kitchen.vue'),
      meta: { requiresKitchenAuth: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const adminToken = localStorage.getItem('admin_token')
  const userToken = localStorage.getItem('user_token')

  // Admin-only routes — must be admin/super_admin
  if (to.meta.requiresAdminAuth) {
    if (!adminToken) return next('/login')
    if (!isAdmin()) return next('/kitchen')
  }

  // Kitchen — admin or chef
  if (to.meta.requiresKitchenAuth) {
    if (!adminToken) return next('/login')
  }

  // Customer auth routes
  if (to.meta.requiresUserAuth && !userToken) {
    return next('/login')
  }

  // Redirect logged-in users away from login page
  if (to.path === '/login') {
    if (adminToken) return next(isAdmin() ? '/' : '/kitchen')
    if (userToken) return next('/user/menu')
  }

  next()
})

export default router
