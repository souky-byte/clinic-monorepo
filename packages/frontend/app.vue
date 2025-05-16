<template>
  <div class="min-h-screen">
    <LoadingOverlay :loading="isLoading" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <NotificationContainer />
  </div>
</template>

<script setup lang="ts">
// import { useAuthStore } from '~/stores/auth'; // Import již není potřeba zde pro tryAutoLogin
import { useNotificationStore } from '~/stores/notification';
import { useLoadingStore } from '~/stores/loading';

// const authStore = useAuthStore(); // Instance authStore již není potřeba zde pro tryAutoLogin
const loadingStore = useLoadingStore();
const isLoading = computed(() => loadingStore.isLoading);

/*
onMounted(() => {
  // Check if token exists in local storage and restore session
  // authStore.tryAutoLogin(); // Přesunuto do Nuxt pluginu plugins/auth.ts
});
*/
</script>

<style>
/* Globální styly, pokud jsou nějaké potřeba */
body {
  @apply bg-gray-50;
}
</style>