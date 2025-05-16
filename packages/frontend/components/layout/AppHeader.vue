<template>
  <header class="bg-white shadow-sm">
    <div class="flex h-16 items-center justify-between px-4 md:px-6">
      <div class="flex items-center">
        <button 
          class="mr-4 p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
          @click="toggleSidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <NuxtLink to="/dashboard" class="flex items-center">
          <span class="text-xl font-bold text-primary-600">HealthCare</span>
          <span class="text-xl font-bold text-gray-900">System</span>
        </NuxtLink>
      </div>
      
      <div class="flex items-center space-x-4">
        <div v-if="user" class="relative">
          <button 
            @click="isUserMenuOpen = !isUserMenuOpen"
            class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <div class="h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
              {{ userInitials }}
            </div>
            <span class="ml-2 hidden md:block">{{ user.name }}</span>
            <svg class="ml-1 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <div 
            v-if="isUserMenuOpen" 
            class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1"
          >
            <div class="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
              {{ user.email }}
            </div>
            <button 
              @click="logout"
              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Odhlásit se
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const userInitials = computed(() => {
  if (!user.value?.name) return '';
  
  return user.value.name
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase();
});

const isUserMenuOpen = ref(false);
const emit = defineEmits(['toggle-sidebar']);

function toggleSidebar() {
  emit('toggle-sidebar');
}

function logout() {
  isUserMenuOpen.value = false;
  authStore.logout();
}

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (event) => {
    if (isUserMenuOpen.value && !event.composedPath().includes(document.querySelector('.relative') as HTMLElement)) {
      isUserMenuOpen.value = false;
    }
  });
});
</script>