<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1>Seznam pacientů</h1>
      <NuxtLink to="/patients/new" class="btn btn-primary">
        <svg class="h-5 w-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Přidat pacienta
      </NuxtLink>
    </div>
    
    <div class="card">
      <Vue3EasyDataTable
        :headers="headers"
        :items="items"
        :loading="loading"
        :server-items-length="serverItemsLength"
        v-model:server-options="serverOptions"
        table-class-name="table"
        theme-color="#1f2937" 
        buttons-pagination
      >
        <template #item-consultant="item">
          {{ item.consultant?.name || '-' }}
        </template>
        <template #item-lastVisit="item">
          {{ formatDate(item.lastVisit) }}
        </template>
        <template #item-totalSpent="item">
          {{ formatCurrency(item.totalSpent) }}
        </template>
        <template #item-createdAt="item">
          {{ formatDate(item.createdAt) }}
        </template>
        <template #item-actions="item">
          <div class="flex space-x-2">
            <!-- TODO: Add Edit/View buttons later -->
            <button @click="viewPatient(item.id)" class="text-blue-600 hover:text-blue-800 p-1" title="Zobrazit detail">
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.005.013-.009.026-.014.039a11.953 11.953 0 01-3.14 3.106M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
             <button v-if="isAdmin" @click="deletePatient(item)" class="text-red-600 hover:text-red-800 p-1" title="Smazat pacienta">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
          </div>
        </template>
      </Vue3EasyDataTable>
    </div>

    <!-- Delete Patient Modal - Uncommented -->
    <dialog-modal
      v-if="showDeleteModal"
      :title="`Opravdu smazat pacienta: ${selectedPatient?.name}?`"
      @close="showDeleteModal = false"
    >
      <p class="text-sm text-gray-500">
        Tato akce je nevratná. Všechna data spojená s tímto pacientem budou trvale odstraněna.
        Pozor: Pokud má pacient záznamy (např. nákupy, schůzky), může být smazání blokováno na straně serveru.
      </p>
      
      <div class="flex justify-end space-x-3 mt-4">
        <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">Zrušit</button>
        <button type="button" class="btn btn-danger" @click="confirmDeletePatient">Smazat</button>
      </div>
    </dialog-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
// @ts-ignore
import Vue3EasyDataTable from 'vue3-easy-data-table';
import type { Header, Item, ServerOptions } from 'vue3-easy-data-table';
import 'vue3-easy-data-table/dist/style.css';

import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';
import { useAuthStore } from '~/stores/auth';
import DialogModal from '~/components/DialogModal.vue';

interface Consultant {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'consultant';
  status?: 'active' | 'inactive';
  lastActive?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface Patient extends Item {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  consultant?: Consultant | null;
  consultantId: number;
  lastVisit?: string | null;
  totalSpent: string; 
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedPatientsResponseDto {
  data: Patient[];
  meta: PaginationMeta;
}

const { $api } = useApiService();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();

const isAdmin = computed(() => authStore.isAdmin);

const headers: Header[] = [
  { text: "Jméno", value: "name", sortable: true },
  { text: "Email", value: "email", sortable: true },
  { text: "Telefon", value: "phone", sortable: false },
  { text: "Konzultant", value: "consultant.name", sortable: true }, // Removed 'field' property
  { text: "Poslední návštěva", value: "lastVisit", sortable: true },
  { text: "Celkem utraceno", value: "totalSpent", sortable: true },
  { text: "Vytvořeno", value: "createdAt", sortable: true },
  { text: "Akce", value: "actions", width: 100 },
];

const items = ref<Patient[]>([]);
const loading = ref(true);
const serverItemsLength = ref(0);
const serverOptions = ref<ServerOptions>({
  page: 1,
  rowsPerPage: 10,
});

const showDeleteModal = ref(false);
const selectedPatient = ref<Patient | null>(null);

const loadFromServer = async () => {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
    };
    if (serverOptions.value.sortBy && serverOptions.value.sortType) {
      params.sortBy = serverOptions.value.sortBy;
      params.sortOrder = serverOptions.value.sortType === 'desc' ? 'DESC' : 'ASC'; 
    }
    
    const response = await $api.get<PaginatedPatientsResponseDto>('/patients', { params });
    items.value = response.data.data;
    serverItemsLength.value = response.data.meta.total;
  } catch (error: any) {
    console.error('Failed to load patients:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst pacienty.' });
  } finally {
    loading.value = false;
  }
};

watch(serverOptions, loadFromServer, { deep: true });

onMounted(() => {
  loadFromServer();
});

function formatDate(dateString: string | undefined | null) {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
    });
  } catch (e) {
    return dateString; 
  }
}

function formatCurrency(value: string | number | undefined | null) {
  if (value === undefined || value === null) return '- Kč';
  let numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(numericValue)) return '- Kč';
  return `${numericValue.toFixed(2)} Kč`;
}

function viewPatient(patientId: number) {
  navigateTo(`/patients/${patientId}`); 
  console.log('View patient:', patientId);
}

function deletePatient(patient: Patient) {
  selectedPatient.value = patient;
  showDeleteModal.value = true;
}

async function confirmDeletePatient() {
  if (!selectedPatient.value) return;
  
  loading.value = true;
  try {
    await $api.delete(`/patients/${selectedPatient.value.id}`);
    notificationStore.show({ type: 'success', message: `Pacient ${selectedPatient.value.name} byl smazán.`});
    showDeleteModal.value = false;
    selectedPatient.value = null;
    loadFromServer(); 
  } catch (error: any) {
    console.error('Failed to delete patient:', error);
    notificationStore.show({ 
      type: 'error', 
      message: error.response?.data?.message || 'Nepodařilo se smazat pacienta. Možná má přiřazené nákupy nebo schůzky.' 
    });
  } finally {
    loading.value = false;
    if (showDeleteModal.value) showDeleteModal.value = false; 
  }
}

</script>

<style scoped>
.table :deep(th .easy-data-table__header-text) {
  font-weight: 600 !important;
  color: rgb(55 65 81) !important; 
  text-align: left; 
}

.table :deep(thead th) {
  background-color: #f9fafb; 
  border-bottom: 2px solid #e5e7eb; 
  padding-top: 12px !important;    
  padding-bottom: 12px !important; 
}

.table :deep(tbody td) {
  padding: 12px 10px !important; 
  border-bottom: 1px solid #f3f4f6; 
}

.table :deep(tbody tr:nth-child(even)) {
  background-color: #f9fafb; 
}

.table :deep(tbody tr:hover) {
  background-color: #f0f9ff; 
}
</style>