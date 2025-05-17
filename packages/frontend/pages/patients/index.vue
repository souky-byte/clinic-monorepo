<template>
  <div class="space-y-6 p-4 md:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-semibold text-gray-900">Seznam pacientů</h1>
      <Button label="Přidat pacienta" icon="pi pi-plus" @click="navigateToNewPatientPage" />
    </div>
    
    <Card>
      <template #content>
        <DataTable
          :value="items"
          :loading="loading"
          lazy
          paginator
          :rows="serverOptions.rowsPerPage"
          :first="firstPageRecord"
          :totalRecords="serverItemsLength"
          @page="onPageChange"
          @sort="onSortChange"
          dataKey="id"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Zobrazeno {first} až {last} z {totalRecords} záznamů"
          :rowsPerPageOptions="[10, 25, 50, 100]"
          class="p-datatable-sm"
          stripedRows
          :showGridlines="false"
          size="small"
          tableStyle="min-width: 50rem"
          sortMode="single"
          removableSort
          :sortField="serverOptions.sortBy"
          :sortOrder="serverOptions.sortOrder === 'ASC' ? 1 : (serverOptions.sortOrder === 'DESC' ? -1 : 0)"
        >
          <template #empty>Nebyly nalezeni žádní pacienti.</template>
          <template #loading>Načítání pacientů...</template>

          <Column field="name" header="Jméno" sortable style="min-width: 12rem;"></Column>
          <!-- <Column field="email" header="Email" sortable style="min-width: 15rem;"></Column> -->
          <!-- <Column field="phone" header="Telefon" style="min-width: 10rem;"></Column> -->
          <Column field="consultant.name" header="Konzultant" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.consultant?.name || '-' }}
            </template>
          </Column>
          <Column field="lastVisit" header="Poslední návštěva" sortable style="min-width: 10rem;">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.lastVisit) }}
            </template>
          </Column>
          <Column field="totalSpent" header="Celkem utraceno" sortable style="min-width: 10rem; text-align: right;">
            <template #body="slotProps">
              {{ formatCurrency(slotProps.data.totalSpent) }}
            </template>
          </Column>
          <!-- <Column field="createdAt" header="Vytvořeno" sortable style="min-width: 10rem;">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.createdAt) }}
            </template>
          </Column> -->
          <Column header="Akce" style="min-width: 8rem; text-align:center" frozen alignFrozen="right">
            <template #body="slotProps">
              <div class="flex gap-2 justify-center">
                <Button icon="pi pi-eye" text rounded severity="info" @click="viewPatient(slotProps.data.id)" v-tooltip.top="'Zobrazit detail'" />
                <Button v-if="isAdmin" icon="pi pi-trash" text rounded severity="danger" @click="deletePatient(slotProps.data)" v-tooltip.top="'Smazat pacienta'" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Delete Patient Modal -->
    <Dialog v-model:visible="showDeleteModal" header="Smazat pacienta" :modal="true" :style="{ width: '450px' }">
      <div class="confirmation-content फ्लेक्स items-center">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="selectedPatient">Opravdu chcete smazat pacienta <b>{{selectedPatient.name}}</b>? <br/> Tato akce je nevratná.</span>
      </div>
       <p class="text-sm text-gray-500 mt-2 ml-11">
        Pozor: Pokud má pacient záznamy (např. nákupy, schůzky), může být smazání blokováno na straně serveru.
      </p>
      <template #footer>
        <Button label="Zrušit" icon="pi pi-times" text @click="showDeleteModal = false"/>
        <Button label="Smazat" icon="pi pi-check" class="p-button-danger" @click="confirmDeletePatient" />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router'; // Added for navigation
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Card from 'primevue/card';
import Tooltip from 'primevue/tooltip';

import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';
import { useAuthStore } from '~/stores/auth';
// DialogModal component is no longer used as PrimeVue Dialog is used directly

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

// Item interface for DataTable (Patient still fine)
interface Patient {
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
  totalSpent: string | number; // Allow number for API flexibility
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
const router = useRouter(); // For navigation

const isAdmin = computed(() => authStore.isAdmin);

const items = ref<Patient[]>([]);
const loading = ref(true);
const serverItemsLength = ref(0);

// ServerOptions for PrimeVue DataTable
const serverOptions = ref({
  page: 1, // PrimeVue Paginator is 0-indexed for page, but API is 1-indexed
  rowsPerPage: 10,
  sortBy: 'createdAt', // Default sort field
  sortOrder: 'DESC' as 'ASC' | 'DESC' | undefined | null, // API expects ASC/DESC or null
});

const firstPageRecord = computed(() => (serverOptions.value.page - 1) * serverOptions.value.rowsPerPage);


const showDeleteModal = ref(false);
const selectedPatient = ref<Patient | null>(null);

const loadFromServer = async () => {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
    };
    if (serverOptions.value.sortBy && serverOptions.value.sortOrder) {
      params.sortBy = serverOptions.value.sortBy;
      params.sortOrder = serverOptions.value.sortOrder;
    }
    
    const response = await $api.get<PaginatedPatientsResponseDto>('/patients', { params });
    items.value = response.data.data;
    serverItemsLength.value = response.data.meta.total;
  } catch (error: any) {
    console.error('Failed to load patients:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst pacienty.' });
    items.value = [];
    serverItemsLength.value = 0;
  } finally {
    loading.value = false;
  }
};

// DataTable event handlers
const onPageChange = (event: DataTablePageEvent) => {
  serverOptions.value.page = event.page + 1; // API is 1-indexed
  serverOptions.value.rowsPerPage = event.rows;
  loadFromServer();
};

const onSortChange = (event: DataTableSortEvent) => {
  serverOptions.value.sortBy = event.sortField as string;
  serverOptions.value.sortOrder = event.sortOrder === 1 ? 'ASC' : (event.sortOrder === -1 ? 'DESC' : null);
  loadFromServer();
};

watch(serverOptions, loadFromServer, { deep: true, immediate: false }); // Remove immediate: true as onMounted handles initial load


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
    return String(dateString); 
  }
}

function formatCurrency(value: string | number | undefined | null) {
  if (value === undefined || value === null) return '- Kč';
  let numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  if (isNaN(numericValue)) return '- Kč';
  // Format as currency for CZK
  return numericValue.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' });
}

function navigateToNewPatientPage() {
  router.push('/patients/new');
}

function viewPatient(patientId: number) {
  router.push(`/patients/${patientId}`); 
}

function deletePatient(patient: Patient) {
  selectedPatient.value = patient;
  showDeleteModal.value = true;
}

async function confirmDeletePatient() {
  if (!selectedPatient.value) return;
  
  // No need to set loading.value here unless specific for this action
  try {
    await $api.delete(`/patients/${selectedPatient.value.id}`);
    notificationStore.show({ type: 'success', message: `Pacient ${selectedPatient.value.name} byl smazán.`});
    showDeleteModal.value = false;
    selectedPatient.value = null;
    // Reset to first page if current page becomes empty or for consistency
    serverOptions.value.page = 1; 
    loadFromServer(); 
  } catch (error: any) {
    console.error('Failed to delete patient:', error);
    notificationStore.show({ 
      type: 'error', 
      message: error.response?.data?.message || 'Nepodařilo se smazat pacienta. Možná má přiřazené nákupy nebo schůzky.' 
    });
  } finally {
    // loading.value = false; // Only if set true for this action
    if (showDeleteModal.value) showDeleteModal.value = false; 
  }
}

</script>

<style scoped>
/* Remove Vue3EasyDataTable specific styles */
/* :deep styles for PrimeVue DataTable if needed, but global styles should cover most */
.p-datatable .p-column-header-content {
  justify-content: left; /* Example: align header text left if default is center */
}

:deep(.p-datatable) {
  border-radius: var(--p-border-radius, 6px);
}

:deep(.p-paginator) {
  border-bottom-left-radius: var(--p-border-radius, 6px);
  border-bottom-right-radius: var(--p-border-radius, 6px);
}
</style>