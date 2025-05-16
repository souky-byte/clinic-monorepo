import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin((nuxtApp) => {
  console.log('[Auth Plugin] Initializing...');

  // Hook into app:mounted which runs once the app is mounted on client-side
  nuxtApp.hook('app:mounted', () => {
    console.log('[Auth Plugin] App is mounted. Running on client...');

    const authStore = useAuthStore();
    console.log('[Auth Plugin] Auth store instance created (inside app:mounted).');
    
    // Pokus o automatické přihlášení při startu aplikace na straně klienta
    authStore.tryAutoLogin();
    console.log(`[Auth Plugin] tryAutoLogin called. isAuthenticated: ${authStore.isAuthenticated} (inside app:mounted)`);
  });
}); 