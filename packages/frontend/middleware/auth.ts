import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();
  console.log(`[Auth Middleware] Running for path: ${to.path}. Current isAuthenticated: ${authStore.isAuthenticated}`);

  // Allow access to login page
  if (to.path === '/login') {
    console.log('[Auth Middleware] Navigating to login page.');
    // If already authenticated, redirect to dashboard
    if (authStore.isAuthenticated) {
      console.log('[Auth Middleware] Already authenticated, redirecting to /dashboard.');
      return navigateTo('/dashboard');
    }
    console.log('[Auth Middleware] Not authenticated, allowing access to /login.');
    return;
  }
  
  // Check if authenticated for all other routes
  if (!authStore.isAuthenticated) {
    console.log(`[Auth Middleware] Not authenticated for path: ${to.path}. Redirecting to /login.`);
    return navigateTo('/login');
  }
  
  console.log(`[Auth Middleware] Authenticated. Checking role-based access for: ${to.path}`);
  // Check role-based access
  const adminOnlyRoutes = ['/appointment-types', '/audit-log', '/consultants'];
  
  if (
    !authStore.isAdmin && 
    adminOnlyRoutes.some(route => to.path.startsWith(route))
  ) {
    console.log(`[Auth Middleware] Non-admin user attempting to access admin route: ${to.path}. Redirecting to /dashboard.`);
    return navigateTo('/dashboard');
  }
  console.log(`[Auth Middleware] Access granted to: ${to.path}`);
});