import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin((nuxtApp) => {
  console.log('[Auth Plugin] Initializing...');

  // Hook into app:mounted which runs once the app is mounted on client-side
  nuxtApp.hook('app:mounted', () => {
    console.log('[Auth Plugin] App is mounted. Running on client...');
    if (process.server) {
      // This check might be redundant if app:mounted is client-only, but good for safety
      console.log('[Auth Plugin] Skipping on server (inside app:mounted).'); 
      return;
    }

    const authStore = useAuthStore();
    console.log('[Auth Plugin] Auth store instance created (inside app:mounted).');
    
    // Pokus o automatické přihlášení při startu aplikace na straně klienta
    authStore.tryAutoLogin();
    console.log(`[Auth Plugin] tryAutoLogin called. isAuthenticated: ${authStore.isAuthenticated} (inside app:mounted)`);
  });
}); 