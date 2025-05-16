import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(async (nuxtApp) => {
  console.log('[Auth Plugin] Initializing on client...');
  if (process.server) {
    console.log('[Auth Plugin] Skipping on server.');
    return;
  }

  const authStore = useAuthStore();
  console.log('[Auth Plugin] Auth store instance created.');
  
  // Pokus o automatické přihlášení při startu aplikace na straně klienta
  authStore.tryAutoLogin();
  console.log(`[Auth Plugin] tryAutoLogin called. isAuthenticated: ${authStore.isAuthenticated}`);
}); 