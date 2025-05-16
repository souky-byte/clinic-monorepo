<template>
  <nav class="bg-white py-3 px-4 md:px-6 shadow-sm" aria-label="Breadcrumbs">
    <ol class="flex items-center space-x-2 text-sm">
      <li>
        <NuxtLink 
          to="/dashboard" 
          class="text-primary-600 hover:text-primary-800 transition-colors duration-200"
        >
          Domů
        </NuxtLink>
      </li>
      <template v-for="(crumb, index) in breadcrumbs" :key="index">
        <li class="text-gray-400">
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </li>
        <li>
          <NuxtLink 
            v-if="crumb.path && index < breadcrumbs.length - 1" 
            :to="crumb.path" 
            class="text-primary-600 hover:text-primary-800 transition-colors duration-200"
          >
            {{ crumb.name }}
          </NuxtLink>
          <span v-else class="text-gray-600 font-medium">
            {{ crumb.name }}
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute();

interface Breadcrumb {
  name: string;
  path?: string;
}

const routeNameMappings: Record<string, string> = {
  'dashboard': 'Dashboard',
  'inventory': 'Sklad',
  'patients': 'Pacienti',
  'patients-id': 'Detail pacienta',
  'appointments': 'Schůzky',
  'appointments-id': 'Detail schůzky',
  'appointment-types': 'Typy schůzek',
  'audit-log': 'Audit log',
  'consultants': 'Konzultanti',
};

const breadcrumbs = computed(() => {
  const pathParts = route.path.split('/').filter(part => part);
  const result: Breadcrumb[] = [];
  
  let currentPath = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += `/${part}`;
    
    // Skip the first part if it's 'dashboard'
    if (i === 0 && part === 'dashboard') continue;
    
    // Handle dynamic routes (like /patients/:id)
    if (part.match(/^[0-9a-fA-F-]+$/)) {
      // This looks like an ID
      const parentRoute = pathParts[i - 1];
      const name = routeNameMappings[`${parentRoute}-id`] || 'Detail';
      result.push({ name });
    } else {
      const name = routeNameMappings[part] || part.charAt(0).toUpperCase() + part.slice(1);
      result.push({ 
        name, 
        path: i < pathParts.length - 1 ? currentPath : undefined 
      });
    }
  }
  
  return result;
});
</script>