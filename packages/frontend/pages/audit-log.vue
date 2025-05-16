<template>
  <div class="p-4 md:p-6 space-y-6">
    <h1 class="text-2xl font-semibold text-gray-900">Audit Log</h1>

    <Card>
      <template #content>
        <div class="mb-4 p-4 bg-gray-50 rounded-lg">
          <h2 class="text-lg font-medium text-gray-800 mb-3">Filtry</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label for="filterUser" class="block text-sm font-medium text-gray-700 mb-1">Uživatel (ID/Jméno)</label>
              <InputText id="filterUser" v-model="filters.user.value" placeholder="Jan Novák nebo 123" class="w-full p-inputtext-sm" />
            </div>
            <div>
              <label for="filterAction" class="block text-sm font-medium text-gray-700 mb-1">Akce</label>
              <InputText id="filterAction" v-model="filters.action.value" placeholder="USER_LOGIN" class="w-full p-inputtext-sm" />
            </div>
            <div>
              <label for="filterSearch" class="block text-sm font-medium text-gray-700 mb-1">Hledat v detailech</label>
              <InputText id="filterSearch" v-model="filters.search.value" placeholder="itemId:5" class="w-full p-inputtext-sm" />
            </div>
            <div>
              <label for="filterStartDate" class="block text-sm font-medium text-gray-700 mb-1">Od data</label>
              <Calendar id="filterStartDate" v-model="filters.startDate.value" dateFormat="yy-mm-dd" showIcon iconDisplay="input" placeholder="YYYY-MM-DD" class="w-full" inputClass="p-inputtext-sm w-full" />
            </div>
            <div>
              <label for="filterEndDate" class="block text-sm font-medium text-gray-700 mb-1">Do data</label>
              <Calendar id="filterEndDate" v-model="filters.endDate.value" dateFormat="yy-mm-dd" showIcon iconDisplay="input" placeholder="YYYY-MM-DD" class="w-full" inputClass="p-inputtext-sm w-full" />
            </div>
             <div class="flex items-end">
              <Button label="Použít filtry" icon="pi pi-filter" @click="applyFilters" class="p-button-sm w-full" />
            </div>
             <div class="flex items-end">
              <Button label="Resetovat" icon="pi pi-refresh" @click="resetFilters" class="p-button-sm p-button-outlined w-full" />
            </div>
          </div>
        </div>

        <DataTable
          :value="auditLogs"
          :loading="loading"
          dataKey="id"
          lazy
          paginator
          :rows="lazyParams.rows"
          :totalRecords="totalRecords"
          :rowsPerPageOptions="[10, 20, 50, 100]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Zobrazeno {first} až {last} z {totalRecords} záznamů"
          tableStyle="min-width: 75rem"
          class="p-datatable-sm"
          stripedRows
          :showGridlines="false"
          size="small"
          @page="onPage"
          @sort="onSort"
          :sortField="lazyParams.sortField"
          :sortOrder="lazyParams.sortOrder"
          filterDisplay="row" 
          v-model:filters="filters"
          removableSort
        >
          <Column field="timestamp" header="Časová značka" :sortable="true" style="width: 15%">
            <template #body="slotProps">
              {{ formatDateTime(slotProps.data.timestamp) }}
            </template>
          </Column>
          <Column field="userName" header="Uživatel" :sortable="true" style="width: 15%">
            <template #body="slotProps">
              {{ slotProps.data.userName || (slotProps.data.userId ? `ID: ${slotProps.data.userId}` : '-') }}
            </template>
          </Column>
          <Column field="action" header="Akce" :sortable="true" style="width: 20%"></Column>
          <Column field="details" header="Detaily" style="width: 30%">
            <template #body="slotProps">
              <pre class="text-xs whitespace-pre-wrap break-all bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">{{ formatDetails(slotProps.data.details) }}</pre>
            </template>
          </Column>
          <Column field="ipAddress" header="IP Adresa" style="width: 10%">
             <template #body="slotProps">
              {{ slotProps.data.ipAddress || '-' }}
            </template>
          </Column>
          <Column field="userAgent" header="User Agent" style="width: 10%">
             <template #body="slotProps">
              <span :title="slotProps.data.userAgent" class="truncate w-full inline-block">
                 {{ slotProps.data.userAgent || '-' }}
              </span>
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-4">Nebyly nalezeny žádné záznamy auditu.</div>
          </template>
          <template #loading>
            <div class="text-center py-4">Načítání záznamů auditu...</div>
          </template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Card from 'primevue/card';
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Calendar from 'primevue/calendar';
// Tooltip a Tag nejsou přímo použity, ale mohou být užitečné pro budoucí vylepšení
// import Tooltip from 'primevue/tooltip'; 
// import Tag from 'primevue/tag';

import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';

// Interface pro záznam auditu (odvozeno z backendu)
interface AuditLogEntry {
  id: number;
  timestamp: string | Date; // API vrací string, Calendar může vracet Date
  userId?: number;
  userName?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Interface pro paginovanou odpověď (odvozeno z backendu)
interface PaginatedAuditLogResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const { $api } = useApiService();
const notificationStore = useNotificationStore();

const auditLogs = ref<AuditLogEntry[]>([]);
const loading = ref(true);
const totalRecords = ref(0);

const defaultRows = 10;
const lazyParams = ref({
  first: 0,
  rows: defaultRows,
  page: 1,
  sortField: 'timestamp',
  sortOrder: -1 as (1 | -1 | undefined), // DataTable expects number | undefined for sortOrder
  filters: {} 
});

// Filtry pro API volání
const filters = ref({
  user: { value: null as string | null, matchMode: 'contains' }, 
  action: { value: null as string | null, matchMode: 'contains' },
  search: { value: null as string | null, matchMode: 'contains' }, 
  startDate: { value: null as Date | null, matchMode: 'gte' }, // Calendar expects Date or null
  endDate: { value: null as Date | null, matchMode: 'lte' }    // Calendar expects Date or null
});


const loadAuditLogs = async () => {
  loading.value = true;
  try {
    const apiParams: Record<string, any> = {
      page: lazyParams.value.page,
      limit: lazyParams.value.rows,
      sortBy: lazyParams.value.sortField || 'timestamp',
      // API expects 'asc' or 'desc'. Default to 'desc' if sortOrder is undefined (e.g. sort removed)
      sortOrder: lazyParams.value.sortOrder === 1 ? 'asc' : 'desc',
    };

    if (filters.value.user.value) apiParams.user = filters.value.user.value;
    if (filters.value.action.value) apiParams.action = filters.value.action.value;
    if (filters.value.search.value) apiParams.search = filters.value.search.value;
    
    if (filters.value.startDate.value) {
      apiParams.startDate = filters.value.startDate.value.toISOString(); 
    }
    if (filters.value.endDate.value) {
      const localEndDate = new Date(filters.value.endDate.value);
      localEndDate.setHours(23, 59, 59, 999); // Set to end of day in local time
      apiParams.endDate = localEndDate.toISOString(); 
    }

    const response = await $api.get<PaginatedAuditLogResult>('/audit-log', { params: apiParams });
    
    auditLogs.value = response.data.data;
    totalRecords.value = response.data.total;
    
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    notificationStore.show({
      type: 'error',
      message: 'Nepodařilo se načíst audit logy.',
    });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadAuditLogs();
});

const onPage = (event: DataTablePageEvent) => {
  lazyParams.value.first = event.first;
  lazyParams.value.rows = event.rows;
  lazyParams.value.page = event.page ? event.page + 1 : 1; // PrimeVue page je 0-indexed
  loadAuditLogs();
};

const onSort = (event: DataTableSortEvent) => {
  lazyParams.value.sortField = event.sortField as string;
  lazyParams.value.sortOrder = event.sortOrder as (1 | -1 | undefined); // PrimeVue sortOrder
  loadAuditLogs();
};

const applyFilters = () => {
  lazyParams.value.page = 1; // Reset na první stránku při aplikaci filtrů
  lazyParams.value.first = 0;
  loadAuditLogs();
};

const resetFilters = () => {
  filters.value.user.value = null;
  filters.value.action.value = null;
  filters.value.search.value = null;
  filters.value.startDate.value = null;
  filters.value.endDate.value = null;
  applyFilters(); // Reload data with reset filters
};

const formatDateTime = (value: string | Date | undefined) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('cs-CZ', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  } catch (e) {
    return String(value);
  }
};

const formatDetails = (details: Record<string, any> | undefined) => {
  if (!details) return '-';
  try {
    return JSON.stringify(details, null, 2);
  } catch (e) {
    return String(details);
  }
};

useHead({
  title: 'Audit Log',
});

definePageMeta({
  middleware: ['auth', 'role'],
  allowedRoles: ['admin']
});
</script>

<style scoped>
/* Zajištění, že truncate bude fungovat správně v buňce tabulky */
:deep(.p-datatable .p-datatable-tbody > tr > td) {
  overflow: hidden;
  text-overflow: ellipsis;
  /* white-space: nowrap; - Toto by mohlo způsobit problémy s pre tagem, pokud je potřeba. */
}
:deep(.p-datatable .p-column-header-content) {
  justify-content: space-between; /* Pro lepší zarovnání sort ikony */
}

/* Pro pre tag, aby správně zalamoval a scrolloval */
pre {
  white-space: pre-wrap;       /* CSS3 */
  white-space: -moz-pre-wrap;  /* Firefox */
  white-space: -pre-wrap;      /* Opera <7 */
  white-space: -o-pre-wrap;    /* Opera 7 */
  word-wrap: break-word;       /* IE */
}
</style> 