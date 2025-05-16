<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <LayoutSidebar :is-open="isSidebarOpen" />

    <!-- Content area -->
    <div class="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden lg:pl-64">
      <!-- Site header -->
      <LayoutAppHeader @toggle-sidebar="toggleSidebar" />

      <!-- Breadcrumbs -->
      <LayoutBreadcrumbs v-if="isAuthenticated" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

const isSidebarOpen = ref(true); // Default to open on larger screens

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
}

// Close sidebar when clicking outside on mobile
const handleClickOutside = (event: MouseEvent) => {
  const sidebar = document.querySelector('aside');
  if (
    isSidebarOpen.value && 
    sidebar && 
    !sidebar.contains(event.target as Node) && 
    window.innerWidth < 1024
  ) {
    isSidebarOpen.value = false;
  }
};

import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* Add any layout-specific styles here */
.bg-gray-50 {
  background-color: #f9fafb;
}
</style>