<template>
  <div class="space-y-6">
    <h1>Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(stat, index) in stats" :key="index" class="card transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
        <div class="flex items-center">
          <div class="p-3 rounded-md" :class="stat.bgColor">
            <component :is="stat.icon" class="h-6 w-6 text-white" />
          </div>
          <div class="ml-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ stat.value }}</h2>
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Dnešní schůzky</h2>
        <div v-if="todayAppointments.length > 0" class="divide-y divide-gray-200">
          <div v-for="(appointment, index) in todayAppointments" :key="index" class="py-3">
            <div class="flex justify-between">
              <div>
                <p class="font-medium">{{ appointment.patient }}</p>
                <p class="text-sm text-gray-500">{{ appointment.type }}</p>
              </div>
              <div class="text-right">
                <p class="font-medium">{{ appointment.time }}</p>
                <p class="text-sm" :class="getStatusColor(appointment.status)">
                  {{ appointment.status }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-center text-gray-500">
          <p>Dnes nemáte žádné schůzky</p>
        </div>
      </div>
      
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Poslední prodeje</h2>
        <div v-if="recentSales.length > 0" class="divide-y divide-gray-200">
          <div v-for="(sale, index) in recentSales" :key="index" class="py-3">
            <div class="flex justify-between">
              <div>
                <p class="font-medium">{{ sale.product }}</p>
                <p class="text-sm text-gray-500">{{ sale.patient }}</p>
              </div>
              <div class="text-right">
                <p class="font-medium">{{ sale.price }} Kč</p>
                <p class="text-sm text-gray-500">{{ sale.date }}</p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-center text-gray-500">
          <p>Zatím nebyly provedeny žádné prodeje</p>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 gap-6">
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Rychlé odkazy</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NuxtLink 
            v-for="(link, index) in quickLinks" 
            :key="index" 
            :to="link.path" 
            class="p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors duration-200"
          >
            <component :is="link.icon" class="h-8 w-8 mx-auto mb-2 text-primary-500" />
            <p class="font-medium">{{ link.name }}</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  middleware: 'auth',
});

const authStore = useAuthStore();

// Icons refactored to use h function
const InventoryIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-6 w-6" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" })
]);

const PatientsIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-6 w-6" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" })
]);

const AppointmentsIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-6 w-6" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })
]);

const CalendarIcon = () => h('svg', { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", class: "h-6 w-6" }, [
  h('path', { 'stroke-linecap': "round", 'stroke-linejoin': "round", 'stroke-width': "2", d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" })
]);

// Mock data (would be replaced with API calls)
const stats = [
  { 
    label: 'Položek skladem', 
    value: '152', 
    icon: InventoryIcon,
    bgColor: 'bg-blue-500'
  },
  { 
    label: 'Pacientů', 
    value: '89', 
    icon: PatientsIcon,
    bgColor: 'bg-green-500'
  },
  { 
    label: 'Schůzek dnes', 
    value: '5', 
    icon: AppointmentsIcon,
    bgColor: 'bg-amber-500'
  },
  { 
    label: 'Prodeje tento měsíc', 
    value: '27', 
    icon: CalendarIcon,
    bgColor: 'bg-purple-500'
  }
];

const todayAppointments = [
  { patient: 'Jan Novák', type: 'Kontrola', time: '9:00', status: 'Dokončeno' },
  { patient: 'Marie Svobodová', type: 'Konzultace', time: '11:30', status: 'Probíhá' },
  { patient: 'Josef Dvořák', type: 'První návštěva', time: '14:00', status: 'Naplánováno' },
  { patient: 'Eva Procházková', type: 'Kontrola', time: '16:30', status: 'Naplánováno' }
];

const recentSales = [
  { product: 'Multivitamin', patient: 'Jan Novák', price: '450', date: 'Dnes, 9:45' },
  { product: 'Probiotika', patient: 'Marie Svobodová', price: '380', date: 'Včera, 14:30' },
  { product: 'Omega-3', patient: 'Tomáš Černý', price: '520', date: '22. března 2024' }
];

const quickLinks = [
  { name: 'Nová schůzka', path: '/appointments/new', icon: AppointmentsIcon },
  { name: 'Nový pacient', path: '/patients/new', icon: PatientsIcon },
  { name: 'Položky skladu', path: '/inventory', icon: InventoryIcon },
  { name: 'Kalendář', path: '/appointments', icon: CalendarIcon }
];

function getStatusColor(status: string) {
  switch (status) {
    case 'Dokončeno':
      return 'text-green-600';
    case 'Probíhá':
      return 'text-blue-600';
    case 'Naplánováno':
      return 'text-amber-600';
    default:
      return 'text-gray-600';
  }
}
</script>