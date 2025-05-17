<template>
  <div class="p-4 md:p-6 space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-semibold text-gray-900">Schůzky</h1>
      <div class="flex items-center gap-2">
        <Button label="Naplánovat schůzku" icon="pi pi-plus" @click="openNewAppointmentDialog" />
        <Button 
          label="Začít schůzku" 
          icon="pi pi-play" 
          @click="startNewAdHocAppointment" 
          v-tooltip.bottom="'Vytvořit novou schůzku a rovnou ji začít'"
          severity="success"
        />
      </div>
    </div>
    
    <Card>
      <template #content>
        <div class="mb-6">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <!-- View Mode Toggle -->
            <SelectButton 
              v-model="viewMode" 
              :options="viewOptions" 
              optionLabel="label" 
              optionValue="value" 
              dataKey="value"
              :pt="{ button: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' } }"
            >
              <template #option="slotProps">
                <i :class="[slotProps.option.icon, 'mr-2']"></i>
                <span>{{ slotProps.option.label }}</span>
              </template>
            </SelectButton>
            
            <!-- Date Navigation -->
            <div class="flex items-center justify-center md:justify-end space-x-2">
              <Button icon="pi pi-chevron-left" @click="changeDate(-1)" text rounded />
              <span class="p-2 min-w-[150px] text-center font-medium text-gray-700">
            {{ formattedCurrentDate }}
              </span>
              <Button icon="pi pi-chevron-right" @click="changeDate(1)" text rounded />
      </div>
          </div>
        </div>
        
        <!-- Filters -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <span class="w-full">
            <InputText v-model="searchQuery" placeholder="Hledat..." class="w-full !py-1.5 !px-2.5 !text-sm" />
          </span>
          
          <Dropdown 
            v-model="consultantFilter" 
            :options="filterConsultantsList" 
            optionLabel="name" 
            optionValue="id" 
            placeholder="Všichni konzultanti" 
            showClear 
            class="w-full" 
            :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
          />
          <Dropdown 
            v-model="typeFilter" 
            :options="filterAppointmentTypesList" 
            optionLabel="name" 
            optionValue="id" 
            placeholder="Všechny typy" 
            showClear 
            class="w-full" 
            :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
          />
          <Dropdown 
            v-if="viewMode !== 'upcoming'" 
            v-model="statusFilter" 
            :options="statusOptions" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="Všechny stavy" 
            showClear 
            class="w-full" 
            :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
          />
        </div>
      
      <!-- Upcoming View -->
      <div v-if="viewMode === 'upcoming'">
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
          removableSort
          sortMode="single"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Zobrazeno {first} až {last} z {totalRecords} záznamů"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          :sortField="serverOptions.sortBy" 
          :sortOrder="serverOptions.sortOrder === 'ASC' ? 1 : (serverOptions.sortOrder === 'DESC' ? -1 : 0)" 
          tableStyle="min-width: 50rem"
          class="p-datatable-sm"
          stripedRows
          :showGridlines="false"
          size="small"
        >
          <Column field="patient.name" header="Pacient" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.patient?.name || '-' }}
            </template>
          </Column>
          <Column field="date" header="Datum a čas" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ formatDateTime(slotProps.data.date) }}
            </template>
          </Column>
          <Column field="appointmentType.name" header="Typ" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.appointmentType?.name || '-' }}
            </template>
          </Column>
          <Column field="consultant.name" header="Konzultant" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.consultant?.name || '-' }}
            </template>
          </Column>
          <Column field="status" header="Stav" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              <Tag :value="getStatusText(slotProps.data.status)" :severity="getStatusSeverity(slotProps.data.status)" rounded />
            </template>
          </Column>
          <Column field="actions" header="Akce" :exportable="false" style="min-width:10rem" :pt="{ headerCell: { class: 'text-center' }, bodyCell: { class: 'text-center' } }">
            <template #body="slotProps">
              <NuxtLink :to="`/appointments/${slotProps.data.id}`">
                <Button icon="pi pi-eye" text rounded aria-label="Detail" v-tooltip.top="'Zobrazit detail'" />
              </NuxtLink>
              <Button 
                v-if="isAppointmentStartable(slotProps.data.status)"
                icon="pi pi-play" 
                text 
                rounded 
                severity="success"
                aria-label="Začít schůzku"
                v-tooltip.top="'Začít schůzku'"
                @click="navigateTo(`/appointments/${slotProps.data.id}/start`)" 
              />
              <!-- TODO: Edit/Cancel buttons with PrimeVue and role checks -->
            </template>
          </Column>
          <template #empty>
            Nebyly nalezeny žádné nadcházející schůzky.
          </template>
          <template #loading>
            Načítání dat nadcházejících schůzek, prosím počkejte...
          </template>
        </DataTable>
      </div>
      
      <!-- List View -->
      <div v-else-if="viewMode === 'list'">
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
          removableSort
          sortMode="single"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Zobrazeno {first} až {last} z {totalRecords} záznamů"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          :sortField="serverOptions.sortBy" 
          :sortOrder="serverOptions.sortOrder === 'ASC' ? 1 : (serverOptions.sortOrder === 'DESC' ? -1 : 0)" 
          tableStyle="min-width: 50rem"
          class="p-datatable-sm"
          stripedRows
          :showGridlines="false"
          size="small"
        >
          <Column field="patient.name" header="Pacient" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.patient?.name || '-' }}
            </template>
          </Column>
          <Column field="date" header="Datum a čas" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ formatDateTime(slotProps.data.date) }}
            </template>
          </Column>
          <Column field="appointmentType.name" header="Typ" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.appointmentType?.name || '-' }}
            </template>
          </Column>
          <Column field="consultant.name" header="Konzultant" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              {{ slotProps.data.consultant?.name || '-' }}
            </template>
          </Column>
          <Column field="status" header="Stav" sortable :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              <Tag :value="getStatusText(slotProps.data.status)" :severity="getStatusSeverity(slotProps.data.status)" rounded />
            </template>
          </Column>
          <Column field="actions" header="Akce" :exportable="false" style="min-width:10rem" :pt="{ headerCell: { class: 'text-center' }, bodyCell: { class: 'text-center' } }">
            <template #body="slotProps">
              <NuxtLink :to="`/appointments/${slotProps.data.id}`">
                <Button icon="pi pi-eye" text rounded aria-label="Detail" v-tooltip.top="'Zobrazit detail'" />
              </NuxtLink>
              <Button 
                v-if="isAppointmentStartable(slotProps.data.status)"
                icon="pi pi-play" 
                text 
                rounded 
                severity="success"
                aria-label="Začít schůzku"
                v-tooltip.top="'Začít schůzku'"
                @click="navigateTo(`/appointments/${slotProps.data.id}/start`)" 
              />
              <!-- TODO: Edit/Cancel buttons with PrimeVue and role checks -->
            </template>
          </Column>
          <template #empty>
            Nebyly nalezeny žádné schůzky.
          </template>
          <template #loading>
            Načítání dat schůzek, prosím počkejte...
          </template>
        </DataTable>
      </div>
      
      <!-- Calendar View (Placeholder) -->
      <div v-else-if="viewMode === 'calendar'" class="border rounded-lg p-4 min-h-[400px] flex flex-col items-center justify-center text-gray-500">
        <i class="pi pi-calendar text-6xl text-gray-300 mb-4"></i>
        <p class="text-xl">Zobrazení kalendáře</p>
        <p>Tato funkcionalita bude implementována.</p>
      </div>
    </template>
  </Card>

  <!-- New Appointment Dialog -->
  <Dialog v-model:visible="newAppointmentDialogVisible" header="Vytvořit novou schůzku" :modal="true" class="p-fluid w-full max-w-lg">
    <div class="space-y-4">
      <div>
        <label for="patient" class="block text-sm font-medium text-gray-700 mb-1">Pacient*</label>
        <Dropdown 
          id="patient" 
          v-model="newAppointmentData.patientId" 
          :options="patientsList" 
          optionLabel="name" 
          optionValue="id" 
          placeholder="Vyberte pacienta" 
          class="w-full" 
          :class="{ 'p-invalid': submittedNewAppointment && !newAppointmentData.patientId }"
          :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
        />
        <small v-if="submittedNewAppointment && !newAppointmentData.patientId" class="p-error">Pacient je povinný.</small>
      </div>

      <div>
        <label for="appointmentType" class="block text-sm font-medium text-gray-700 mb-1">Typ schůzky*</label>
        <Dropdown 
          id="appointmentType" 
          v-model="newAppointmentData.appointmentTypeId" 
          :options="filterAppointmentTypesList" 
          optionLabel="name" 
          optionValue="id" 
          placeholder="Vyberte typ schůzky" 
          class="w-full" 
          :class="{ 'p-invalid': submittedNewAppointment && !newAppointmentData.appointmentTypeId }"
          :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
        />
        <small v-if="submittedNewAppointment && !newAppointmentData.appointmentTypeId" class="p-error">Typ schůzky je povinný.</small>
      </div>

      <div>
        <label for="appointmentDate" class="block text-sm font-medium text-gray-700 mb-1">Datum a čas*</label>
        <Calendar 
          id="appointmentDate" 
          v-model="newAppointmentData.date" 
          showTime 
          hourFormat="24" 
          dateFormat="dd.mm.yy" 
          placeholder="Vyberte datum a čas"
          class="w-full"
          :class="{ 'p-invalid': submittedNewAppointment && !newAppointmentData.date }"
          :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight w-full' } }" 
        />
         <small v-if="submittedNewAppointment && !newAppointmentData.date" class="p-error">Datum a čas jsou povinné.</small>
      </div>

      <div>
        <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
        <Textarea id="notes" v-model="newAppointmentData.notes" rows="4" class="w-full !text-sm" placeholder="Zadejte poznámky ke schůzce" />
      </div>
      
      <!-- Placeholder for Products Selection -->
      <div class="p-4 border border-dashed border-gray-300 rounded-md mt-4">
          <p class="text-center text-gray-500 text-sm">Výběr produktů bude implementován zde.</p>
      </div>

    </div>
    <template #footer>
      <Button label="Zrušit" icon="pi pi-times" text @click="hideNewAppointmentDialog" />
      <Button label="Uložit schůzku" icon="pi pi-check" @click="saveNewAppointment" />
    </template>
  </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';
import { useAuthStore } from '~/stores/auth'; 

// PrimeVue Components - auto-imported by @primevue/nuxt-module usually, 
// but explicit imports can help with type inference and clarity.
// If auto-import works, these can be removed.
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';
import Textarea from 'primevue/textarea';
import Tooltip from 'primevue/tooltip';
// import Calendar from 'primevue/calendar'; // For later calendar view implementation

definePageMeta({
  middleware: 'auth',
});

const { $api } = useApiService();
const notificationStore = useNotificationStore();
const authStore = useAuthStore(); 

// Interfaces (same as before)
interface PatientLite { id: number; name: string; }
interface ConsultantLite { id: number; name: string; }
interface AppointmentTypeLite { id: number; name: string; duration?: number; }
interface AppointmentProductItem { id: number; inventoryItemId: number; quantity: number; priceAtTimeOfBooking: string; vatRateAtTimeOfBooking: string; }
interface Appointment { id: number; patientId: number; appointmentTypeId: number; consultantId: number; date: string; notes?: string | null; appointmentProducts?: AppointmentProductItem[]; totalPrice?: string | null; status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show'; createdAt: string; updatedAt: string; patient?: PatientLite; consultant?: ConsultantLite; appointmentType?: AppointmentTypeLite;}
interface PaginatedAppointmentsResponse { data: Appointment[]; meta: { total: number; page: number; limit: number; totalPages: number; };}

// View state
const viewMode = ref('upcoming');
const viewOptions = ref([
  { label: 'Nadcházející', value: 'upcoming', icon: 'pi pi-calendar-plus' },
  { label: 'Seznam', value: 'list', icon: 'pi pi-list' },
  { label: 'Kalendář', value: 'calendar', icon: 'pi pi-calendar' }
]);
const currentDate = ref(new Date());

// Filters
const searchQuery = ref('');
const consultantFilter = ref<number | null>(null);
const typeFilter = ref<number | null>(null);
const statusFilter = ref<string | null>(null);

const filterConsultantsList = ref<ConsultantLite[]>([]);
const filterAppointmentTypesList = ref<AppointmentTypeLite[]>([]);
const statusOptions = ref([
  { label: 'Naplánováno', value: 'scheduled' },
  { label: 'Probíhá', value: 'in-progress' },
  { label: 'Dokončeno', value: 'completed' },
  { label: 'Zrušeno', value: 'cancelled' },
  { label: 'Přeplánováno', value: 'rescheduled' },
  { label: 'Nedostavil se', value: 'no-show' },
]);

// DataTable state
const items = ref<Appointment[]>([]);
const loading = ref(true);
const serverItemsLength = ref(0);
const serverOptions = ref({
  page: 1, // PrimeVue Paginator is 0-indexed for page, but API is 1-indexed
  rowsPerPage: 10,
  sortBy: 'date', 
  sortOrder: 'DESC' as 'ASC' | 'DESC' | undefined | null, // API expects ASC/DESC
});

const firstPageRecord = computed(() => (serverOptions.value.page - 1) * serverOptions.value.rowsPerPage);

// --- New Appointment Dialog State ---
const newAppointmentDialogVisible = ref(false);

interface NewAppointmentProduct {
  inventoryItemId: number | null;
  quantity: number | null;
}

interface NewAppointmentData {
  patientId: number | null;
  appointmentTypeId: number | null;
  consultantId: number | null;
  date: Date | null; // Corrected type for Calendar v-model
  notes: string | null;
  products: NewAppointmentProduct[]; // Will be handled in a follow-up
}

const defaultNewAppointmentData: NewAppointmentData = {
  patientId: null,
  appointmentTypeId: null,
  consultantId: null,
  date: null, // Initialize as null
  notes: '',
  products: []
};

const newAppointmentData = ref<NewAppointmentData>({ ...defaultNewAppointmentData });
const submittedNewAppointment = ref(false); // For validation feedback

const patientsList = ref<PatientLite[]>([]); // Assuming PatientLite is suitable
const inventoryItemsList = ref<any[]>([]); // Define interface for InventoryItem if needed

// --- Data Fetching ---
async function fetchFilterData() {
  try {
    const [consultantsRes, typesRes] = await Promise.all([
      $api.get<{data: ConsultantLite[]}>('/consultants', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } }),
      $api.get<{data: AppointmentTypeLite[]}>('/appointment-types', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } })
    ]);
    
    console.log('Consultants API Response:', consultantsRes);
    console.log('Appointment Types API Response:', typesRes);

    let rawConsultants = [];
    if (consultantsRes.data && Array.isArray(consultantsRes.data.data)) rawConsultants = consultantsRes.data.data;
    else if (consultantsRes.data && Array.isArray(consultantsRes.data)) rawConsultants = consultantsRes.data as any;
    filterConsultantsList.value = rawConsultants;

    let rawTypes = [];
    if (typesRes.data && Array.isArray(typesRes.data.data)) rawTypes = typesRes.data.data;
    else if (typesRes.data && Array.isArray(typesRes.data)) rawTypes = typesRes.data as any;
    filterAppointmentTypesList.value = rawTypes;

  } catch (error) {
    console.error("Failed to load filter data:", error);
    notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst data pro filtry.' });
  }
}

const loadFromServer = async () => {
  if (viewMode.value === 'calendar') {
    items.value = [];
    serverItemsLength.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      sortBy: serverOptions.value.sortBy,
      sortOrder: serverOptions.value.sortOrder,
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (consultantFilter.value !== null) params.consultantId = consultantFilter.value;
    if (typeFilter.value !== null) params.appointmentTypeId = typeFilter.value;

    if (viewMode.value === 'upcoming') {
      params.status = 'upcoming';
      if (statusFilter.value !== null) statusFilter.value = null;
    } else if (viewMode.value === 'list') {
      if (statusFilter.value !== null) params.status = statusFilter.value;
    }
        
    const response = await $api.get<PaginatedAppointmentsResponse>('/appointments', { params });
    items.value = response.data.data;
    serverItemsLength.value = response.data.meta.total;
  } catch (error: any) {
    console.error('Failed to load appointments:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst schůzky.' });
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
    
// Watchers for filters
watch([searchQuery, consultantFilter, typeFilter, statusFilter], () => {
  serverOptions.value.page = 1; // Reset to first page on filter change
  loadFromServer();
});

watch(viewMode, () => {
  serverOptions.value.page = 1;
  if (viewMode.value === 'list') {
    loadFromServer();
  } else {
    items.value = []; // Clear table items when switching to calendar
    serverItemsLength.value = 0; 
    loading.value = false; 
    console.log("Switched to calendar view. Implement calendar data loading.");
    // TODO: Implement calendar data loading here using /api/appointments/calendar and currentDate
  }
});

// --- Date and Formatting Helpers ---
const formattedCurrentDate = computed(() => {
  // For calendar view, this might show a month/year or week range
  // For list view, it can be less prominent or show current filter range if implemented
  return currentDate.value.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
});

function changeDate(increment: number) { // increment is -1 or 1
  const newDate = new Date(currentDate.value);
  if (viewMode.value === 'calendar') {
     newDate.setMonth(newDate.getMonth() + increment); 
  } else {
    // For list view, this date might not directly control data loading unless explicitly tied
    // For now, let it just change the displayed date. Consider if list should filter by this.
    newDate.setMonth(newDate.getMonth() + increment); // Example: change by month for now
  }
  currentDate.value = newDate;
  if (viewMode.value === 'list') {
    // loadFromServer(); // Uncomment if list should reload based on this date
  } else {
    // TODO: Trigger calendar data refresh for the new currentDate
    console.log("Date changed for calendar view - implement data refresh based on currentDate.value");
  }
}

function formatDateTime(dateTimeString?: string) {
  if (!dateTimeString) return '-';
  try {
    return new Date(dateTimeString).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return dateTimeString; }
}

const statusMap: Record<string, { text: string; severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined }> = {
  scheduled: { text: 'Naplánováno', severity: 'info' },
  'in-progress': { text: 'Probíhá', severity: 'warning' },
  completed: { text: 'Dokončeno', severity: 'success' },
  cancelled: { text: 'Zrušeno', severity: 'danger' },
  rescheduled: { text: 'Přeplánováno', severity: 'info' }, // Or a different color
  'no-show': { text: 'Nedostavil se', severity: 'secondary' }, // PrimeVue Tag severities
};

function getStatusText(statusKey?: string): string {
  if (!statusKey || !statusMap[statusKey as keyof typeof statusMap]) return 'Neznámý';
  return statusMap[statusKey as keyof typeof statusMap].text;
}

function getStatusSeverity(statusKey?: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
  if (!statusKey || !statusMap[statusKey as keyof typeof statusMap]) return undefined;
  return statusMap[statusKey as keyof typeof statusMap].severity;
}

function isAppointmentStartable(status?: string): boolean {
  return status === 'scheduled';
}

// --- Calendar Specific (Placeholder) ---
// const calendarAppointments = ref([]); // For data fetched for FullCalendar or custom calendar
// async function fetchCalendarAppointments(startDate, endDate) { ... call /api/appointments/calendar ... }

async function fetchPatients() {
  try {
    // Assuming a similar structure to other list fetches, adjust if API differs
    const response = await $api.get<{data: PatientLite[]}>('/patients', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } }); // Corrected limit
    let rawPatients = [];
    if (response.data && Array.isArray(response.data.data)) rawPatients = response.data.data;
    else if (response.data && Array.isArray(response.data)) rawPatients = response.data as any; // Fallback for direct array
    patientsList.value = rawPatients;
  } catch (error) {
    console.error("Failed to load patients list:", error);
    notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst seznam pacientů.' });
  }
}

async function fetchInventoryItems() {
  try {
    // Adjust endpoint and response structure as needed
    const response = await $api.get<{data: any[]}>('/inventory', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } }); // Corrected limit
    let rawItems = [];
     if (response.data && Array.isArray(response.data.data)) rawItems = response.data.data;
    else if (response.data && Array.isArray(response.data)) rawItems = response.data as any;
    inventoryItemsList.value = rawItems;
    // console.log('Fetched inventory items:', inventoryItemsList.value); // For debugging
  } catch (error) {
    console.error("Failed to load inventory items list:", error);
    notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst seznam produktů/položek.' });
  }
}

const openNewAppointmentDialog = () => {
  newAppointmentData.value = { ...defaultNewAppointmentData };
  newAppointmentData.value.consultantId = authStore.user?.id || null;
  newAppointmentData.value.date = new Date(); // Initialize with a Date object
  submittedNewAppointment.value = false;
  newAppointmentDialogVisible.value = true;
};

const hideNewAppointmentDialog = () => {
  newAppointmentDialogVisible.value = false;
  submittedNewAppointment.value = false;
};

const saveNewAppointment = async () => {
  submittedNewAppointment.value = true;

  // Basic Validation (expand as needed)
  if (!newAppointmentData.value.patientId || !newAppointmentData.value.appointmentTypeId || !newAppointmentData.value.date) {
    notificationStore.show({ type: 'error', message: 'Vyplňte prosím všechna povinná pole (Pacient, Typ schůzky, Datum).' });
    return;
  }

  // Ensure date is in ISO format if it's a Date object
  let isoDate;
  if (newAppointmentData.value.date instanceof Date) {
    isoDate = newAppointmentData.value.date.toISOString();
  // No need for string check here anymore as v-model will be Date | null
  } else if (!newAppointmentData.value.date) { // Check if it's null
    notificationStore.show({ type: 'error', message: 'Datum není správně nastaveno.' });
    return;
  } else {
    // Should not happen if type is strictly Date | null, but as a fallback:
    notificationStore.show({ type: 'error', message: 'Neplatný formát data.'});
    return;
  }
  
  const payload = {
    patientId: newAppointmentData.value.patientId,
    appointmentTypeId: newAppointmentData.value.appointmentTypeId,
    consultantId: newAppointmentData.value.consultantId,
    date: isoDate,
    notes: newAppointmentData.value.notes || null, // API might expect null for empty
    products: newAppointmentData.value.products.filter(p => p.inventoryItemId && p.quantity && p.quantity > 0) // Placeholder for products
  };

  try {
    await $api.post('/appointments', payload);
    notificationStore.show({ type: 'success', message: 'Nová schůzka byla úspěšně vytvořena.' });
    hideNewAppointmentDialog();
    loadFromServer(); // Refresh the main list
  } catch (error: any) {
    console.error('Failed to create appointment:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se vytvořit schůzku.' });
  }
};

// Lifecycle Hooks
onMounted(() => {
  fetchFilterData();
  fetchPatients(); // Fetch patients on mount
  fetchInventoryItems(); // Fetch inventory items on mount
  if (viewMode.value === 'list' || viewMode.value === 'upcoming') { // Also load for upcoming
    loadFromServer();
  } else {
    // Initial load for calendar - TBD
  }
});

// Watchers for filters & viewMode
watch([searchQuery, consultantFilter, typeFilter, statusFilter, viewMode], () => {
  serverOptions.value.page = 1; // Reset to first page on filter or view change
  loadFromServer(); // This will now correctly handle 'upcoming' due to logic inside it
}, { deep: true });

// --- Method for the "Start Ad-hoc Meeting" button ---
function startNewAdHocAppointment() {
  navigateTo('/appointments/start-new-adhoc');
}

</script>

<style scoped>
/* Add any custom styles or overrides for PrimeVue components here if needed */
/* For example, to ensure DataTable fits well */
:deep(.p-datatable) {
  border-radius: var(--p-border-radius, 6px); /* Use PrimeVue variable or your own */
}

:deep(.p-column-header-content) { 
  justify-content: flex-start; /* Align header text to the left */
}

:deep(.p-paginator) {
  border-bottom-left-radius: var(--p-border-radius, 6px);
  border-bottom-right-radius: var(--p-border-radius, 6px);
}
</style>