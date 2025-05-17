<template>
  <aside 
    class="fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-50 border-r border-gray-200 text-slate-700 transform transition-all duration-300 ease-in-out"
    :class="{ 'w-64': isOpen, 'w-20': !isOpen }"
  >
    <div 
      class="h-16 flex items-center shrink-0 px-4 border-b border-gray-200 transition-all duration-300 ease-in-out"
      :class="{ 'justify-center': !isOpen, 'justify-start': isOpen }"
    >
      <span v-if="isOpen" class="text-xl font-semibold text-slate-800">Klinika</span>
      <span v-else class="text-xl font-semibold text-slate-800"><i class="pi pi-th-large"></i></span>
      <!-- Simplified header: Shows 'Klinika' when open, 'pi-th-large' icon when closed -->
    </div>
    
    <nav class="flex-1 overflow-y-auto py-2 px-2 space-y-1">
      <Menu :model="menuModelRef" class="w-full">
        <template #item="{ item, props: itemProps }">
          <NuxtLink 
            :to="item.to" 
            v-tooltip.right="!isOpen ? item.label : null" 
            class="flex items-center p-3 rounded-md transition-colors duration-150 ease-in-out"
            :class="[
              isActive(item.to) 
                ? 'bg-sky-100 text-sky-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-700',
              isOpen ? 'justify-start' : 'justify-center'
            ]"
          >
            <i :class="[item.icon, 'text-lg']" />
            <span 
              v-if="isOpen"
              class="ml-3 text-sm transition-opacity duration-150 ease-in-out"
              :class="{ 'opacity-100': isOpen, 'opacity-0 h-0': !isOpen }"
            >
              {{ item.label }}
            </span>
          </NuxtLink>
        </template>
      </Menu>
    </nav>

  </aside>
</template>

<script setup lang="ts">
import { h, computed, ref, watchEffect } from 'vue';
import { useAuthStore } from '~/stores/auth';
import Menu from 'primevue/menu';
import Tooltip from 'primevue/tooltip';

const props = defineProps<{
  isOpen: boolean;
}>();

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const route = useRoute();

// Icons will be replaced by PrimeIcons in menuModel
// Keep navItems structure for now, will transform to PrimeVue menu model
// Example PrimeIcons: pi-home, pi-box, pi-users, pi-calendar, pi-file-edit, pi-history, pi-id-card

const navItems = [
  { path: '/dashboard', name: 'Dashboard', iconName: 'pi pi-home', adminOnly: false },
  { path: '/inventory', name: 'Inventář', iconName: 'pi pi-box', adminOnly: false },
  { path: '/patients', name: 'Pacienti', iconName: 'pi pi-users', adminOnly: false },
  { path: '/appointments', name: 'Schůzky', iconName: 'pi pi-calendar', adminOnly: false },
  { path: '/appointment-types', name: 'Typy schůzek', iconName: 'pi pi-file-edit', adminOnly: true },
  { path: '/audit-log', name: 'Audit log', iconName: 'pi pi-history', adminOnly: true },
  { path: '/consultants', name: 'Konzultanti', iconName: 'pi pi-id-card', adminOnly: true },
];

const filteredNavItems = computed(() => {
  if (isAdmin.value) {
    return navItems;
  }
  return navItems.filter(item => !item.adminOnly);
});

const menuModelRef = ref<any[]>([]);

watchEffect(() => {
  menuModelRef.value = filteredNavItems.value.map(item => ({
    label: item.name,
    icon: item.iconName,
    to: item.path,
    // We'll use template to handle active state and NuxtLink
  }));
});

// isActive function will be used inside the template for custom active class logic
function isActive(path: string) {
  // Exact match for dashboard, startsWith for others if they have sub-routes
  if (path === '/dashboard') return route.path === path;
  return route.path.startsWith(path) && path !== '/'; // ensure path is not just root
}

// TODO: Define menuModel for PrimeVue <p-menu> based on filteredNavItems
// TODO: Import and integrate <p-menu>

</script>

<style scoped>
/* Scoped styles for fine-tuning */
/* Ensure icons in collapsed state are centered if needed */
.w-20 .pi {
  /* font-size: 1.5rem; /* Example if icons need to be larger when collapsed */
}

/* Remove default PrimeVue Menu padding/styles that we don't want */
:deep(.p-menu) {
  background: transparent;
  border: none;
  width: 100%;
  padding: 0;
}

:deep(.p-menu .p-menuitem > .p-menuitem-content) {
  background: transparent;
  transition: background-color 0.2s, color 0.2s;
  /* Removed margin and border-radius, will be on NuxtLink directly */
  padding: 0; /* Reset padding as NuxtLink will handle it */
}

:deep(.p-menu .p-menuitem > .p-menuitem-content .p-menuitem-link) {
  padding: 0; /* Reset padding as NuxtLink will handle it */
  width: 100%;
  display: flex;
  align-items: center;
}

/* Custom active and hover states will be applied via template classes on NuxtLink */
</style>