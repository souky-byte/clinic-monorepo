<template>
  <aside 
    class="fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform transition-transform duration-300 lg:translate-x-0"
    :class="{ '-translate-x-full': !isOpen }"
  >
    <div class="h-16 flex items-center justify-center border-b border-gray-700">
      <h2 class="text-xl font-bold">Menu</h2>
    </div>
    <NavigationMenuRoot class="py-4 w-full">
      <NavigationMenuList class="space-y-1 flex flex-col w-full">
        <NavigationMenuItem v-for="item in filteredNavItems" :key="item.path" class="w-full">
          <NavigationMenuLink 
            class="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 w-full"
            :class="{ 'bg-gray-700 text-white': isActive(item.path) }"
            as-child
          >
            <NuxtLink :to="item.path" class="flex items-center w-full">
              <component :is="item.icon" class="h-5 w-5 mr-3 shrink-0" />
              <span>{{ item.name }}</span>
            </NuxtLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenuRoot>
  </aside>
</template>

<script setup lang="ts">
import { h, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import {
  NavigationMenuRoot,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from 'radix-vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const route = useRoute();

interface IconProps {
  class: string;
}

// Definice ikon jako funkční komponenty
const DashboardIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M3 12l2-2m0 0l7-7 7 7m-7-7v14" })
]);

const InventoryIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" })
]);

const PatientsIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" })
]);

const AppointmentsIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })
]);

const AppointmentTypesIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" })
]);

const AuditLogIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" })
]);

const ConsultantsIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-5 w-5" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" })
]);

const PackageIcon = (props: IconProps) => h('svg', { ...props, xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', strokeWidth: '1.5', stroke: 'currentColor', innerHTML: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10.5 8.25h3M12 3v5.25m0 0l-1.125-1.125M12 8.25l1.125-1.125M3.75 7.5h16.5c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.75C3.129 5.25 2.625 5.754 2.625 6.375v0.001c0 .621.504 1.125 1.125 1.125z" />'});

const navItems = [
  { path: '/dashboard', name: 'Dashboard', icon: DashboardIcon, adminOnly: false },
  { path: '/inventory', name: 'Sklad', icon: InventoryIcon, adminOnly: false },
  { path: '/patients', name: 'Pacienti', icon: PatientsIcon, adminOnly: false },
  { path: '/appointments', name: 'Schůzky', icon: AppointmentsIcon, adminOnly: false },
  { path: '/appointment-types', name: 'Typy schůzek', icon: AppointmentTypesIcon, adminOnly: true },
  { path: '/audit-log', name: 'Audit log', icon: AuditLogIcon, adminOnly: true },
  { path: '/consultants', name: 'Konzultanti', icon: ConsultantsIcon, adminOnly: true },
  { path: '/packages', name: 'Packages', icon: PackageIcon, adminOnly: false },
];

const filteredNavItems = computed(() => {
  if (isAdmin.value) {
    return navItems;
  }
  return navItems.filter(item => !item.adminOnly);
});

function isActive(path: string) {
  return route.path.startsWith(path);
}
</script>