<template>
  <div class="p-4 md:p-6 space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-semibold text-gray-900">Typy schůzek</h1>
      <Button label="Přidat typ schůzky" icon="pi pi-plus" @click="openAddModal" />
    </div>

    <Card>
      <template #content>
        <DataTable 
          :value="appointmentTypes" 
          :loading="pending" 
          data-key="id"
          lazy 
          paginator 
          :rows="10" 
          :rowsPerPageOptions="[5, 10, 20, 50]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          currentPageReportTemplate="Zobrazeno {first} až {last} z {totalRecords} záznamů"
          tableStyle="min-width: 50rem"
          class="p-datatable-sm"
          stripedRows
          :showGridlines="false"
          size="small"
        >
          <Column field="id" header="ID" :sortable="true" style="width: 8%" :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }"></Column>
          <Column field="name" header="Název" :sortable="true" style="width: 25%" :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }"></Column>
          <Column field="description" header="Popis" style="width: 30%" :pt="{ headerCell: { class: 'text-left' }, bodyCell: { class: 'text-left' } }">
            <template #body="slotProps">
              <span class="truncate w-full inline-block" :title="slotProps.data.description">
                {{ slotProps.data.description || '-' }}
              </span>
            </template>
          </Column>
          <Column field="price" header="Cena" :sortable="true" style="width: 10%" :pt="{ headerCell: { class: 'text-right' }, bodyCell: { class: 'text-right' } }">
            <template #body="slotProps">
              {{ formatCurrency(slotProps.data.price) }}
            </template>
          </Column>
          <Column field="durationMinutes" header="Délka (min)" :sortable="true" style="width: 10%" :pt="{ headerCell: { class: 'text-center' }, bodyCell: { class: 'text-center' } }"></Column>
          <Column field="visibleToAll" header="Veřejné" :sortable="true" style="width: 10%" :pt="{ headerCell: { class: 'text-center' }, bodyCell: { class: 'text-center' } }">
            <template #body="slotProps">
              <Tag :value="slotProps.data.visibleToAll ? 'Ano' : 'Ne'" 
                   :severity="slotProps.data.visibleToAll ? 'success' : 'danger'" 
                   rounded>
                   <template #icon>
                    <i :class="[slotProps.data.visibleToAll ? 'pi pi-check-circle' : 'pi pi-times-circle', 'mr-1']"></i>
                   </template>
              </Tag>
            </template>
          </Column>
          <Column header="Akce" style="width: 120px" :pt="{ headerCell: { class: 'text-center' }, bodyCell: { class: 'text-center' } }">
            <template #body="slotProps">
              <Button icon="pi pi-pencil" text rounded class="mr-1 text-blue-500 hover:bg-blue-500/10" @click="openEditModal(slotProps.data)" v-tooltip.top="'Upravit'"/>
              <Button icon="pi pi-trash" text rounded class="text-red-500 hover:bg-red-500/10" @click="confirmDelete(slotProps.data)" v-tooltip.top="'Smazat'"/>
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-4">
              Žádné typy schůzek nebyly nalezeny.
            </div>
          </template>
          <template #loading>
            <div class="text-center py-4">
              Načítání typů schůzek...
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Add/Edit Appointment Type Dialog -->
    <Dialog 
      v-model:visible="isUpsertModalOpen" 
      :header="isEditing ? 'Upravit typ schůzky' : 'Přidat nový typ schůzky'" 
      :modal="true" 
      class="p-fluid w-full max-w-lg"
      @hide="closeUpsertModal"
    >
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Název*</label>
          <InputText id="name" v-model.trim="upsertData.name" required :invalid="submitted && !upsertData.name" class="w-full" />
          <small v-if="submitted && !upsertData.name" class="p-error">Název je povinný.</small>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Popis</label>
          <Textarea id="description" v-model="upsertData.description" rows="3" class="w-full" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="price" class="block text-sm font-medium text-gray-700 mb-1">Cena (Kč)*</label>
            <InputNumber id="price" v-model="upsertData.price" mode="currency" currency="CZK" locale="cs-CZ" required :invalid="submitted && upsertData.price === null" :min="0" />
            <small v-if="submitted && upsertData.price === null" class="p-error">Cena je povinná.</small>
          </div>
          <div>
            <label for="durationMinutes" class="block text-sm font-medium text-gray-700 mb-1">Délka (minuty)*</label>
            <InputNumber id="durationMinutes" v-model="upsertData.durationMinutes" required :invalid="submitted && upsertData.durationMinutes === null" :min="5" :step="5" />
            <small v-if="submitted && upsertData.durationMinutes === null" class="p-error">Délka je povinná.</small>
          </div>
        </div>

        <div class="flex items-center space-x-3 mt-4">
          <ToggleSwitch v-model="upsertData.visibleToAll" inputId="visibleToAll" />
          <label for="visibleToAll" class="text-sm font-medium text-gray-700">Veřejně viditelné pro všechny konzultanty</label>
        </div>
        
        <div v-if="!upsertData.visibleToAll">
          <label for="visibleToSpecificConsultantIds" class="block text-sm font-medium text-gray-700 mb-1">Viditelné pro specifické konzultanty (ID oddělená čárkou)</label>
          <InputText id="visibleToSpecificConsultantIds" v-model="visibleToSpecificConsultantIdsString" class="w-full" placeholder="např. 1,2,3" />
           <small class="text-xs text-gray-500">Pokud je prázdné a "Veřejně viditelné" je odškrtnuto, typ nebude viditelný pro žádného konzultanta, kromě adminů.</small>
        </div>

      </div>
      <template #footer>
        <Button label="Zrušit" icon="pi pi-times" text @click="closeUpsertModal" />
        <Button :label="isEditing ? 'Uložit změny' : 'Vytvořit typ'" icon="pi pi-check" @click="saveAppointmentType" :loading="saving" />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';

import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';

// Stávající interface pro zobrazení v tabulce (může být shodný s AppointmentTypeResponse)
interface AppointmentType {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  visibleToAll: boolean;
  visibleToSpecificConsultantIds?: number[];
  createdAt?: string; 
  updatedAt?: string;
}

// Interface pro request na vytvoření (dle zadání)
export interface CreateAppointmentTypeRequest {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  visibleToAll: boolean;
  visibleToSpecificConsultantIds?: number[];
}

// Interface pro request na úpravu (dle zadání)
// Partial<CreateAppointmentTypeRequest> znamená, že všechna pole jsou volitelná
export interface UpdateAppointmentTypeRequest extends Partial<CreateAppointmentTypeRequest> {}


const { $api } = useApiService();
const notificationStore = useNotificationStore();

const appointmentTypes = ref<AppointmentType[]>([]);
const pending = ref(true);
const saving = ref(false);

// Stav pro modální okno a formulář
const isUpsertModalOpen = ref(false);
const isEditing = ref(false);
const submitted = ref(false);
const selectedAppointmentTypeId = ref<number | null>(null);

const defaultUpsertData: CreateAppointmentTypeRequest = {
  name: '',
  description: '',
  price: 0, // Nebo null, pokud InputNumber lépe pracuje s null pro prázdné hodnoty
  durationMinutes: 30, // Defaultní hodnota
  visibleToAll: true,
  visibleToSpecificConsultantIds: [],
};
const upsertData = ref<CreateAppointmentTypeRequest>({ ...defaultUpsertData });
const visibleToSpecificConsultantIdsString = ref('');


async function fetchAppointmentTypes() {
  pending.value = true;
  try {
    const response = await $api.get<AppointmentType[]>('/appointment-types');
    appointmentTypes.value = response.data; 
  } catch (error) {
    console.error('Failed to fetch appointment types:', error);
    notificationStore.show({
      type: 'error',
      message: 'Nepodařilo se načíst typy schůzek.'
    });
  } finally {
    pending.value = false;
  }
}

onMounted(() => {
  fetchAppointmentTypes();
});

const formatCurrency = (value: number) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(value);
};

function parseConsultantIds(idsString: string): number[] {
  if (!idsString || idsString.trim() === '') return [];
  return idsString.split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0);
}

function openAddModal() {
  isEditing.value = false;
  submitted.value = false;
  upsertData.value = { ...defaultUpsertData };
  visibleToSpecificConsultantIdsString.value = '';
  isUpsertModalOpen.value = true;
}

function openEditModal(item: AppointmentType) {
  isEditing.value = true;
  submitted.value = false;
  selectedAppointmentTypeId.value = item.id;
  upsertData.value = {
    name: item.name,
    description: item.description || '',
    price: item.price,
    durationMinutes: item.durationMinutes,
    visibleToAll: item.visibleToAll,
    visibleToSpecificConsultantIds: item.visibleToSpecificConsultantIds ? [...item.visibleToSpecificConsultantIds] : [],
  };
  visibleToSpecificConsultantIdsString.value = item.visibleToSpecificConsultantIds?.join(', ') || '';
  isUpsertModalOpen.value = true;
}

function closeUpsertModal() {
  isUpsertModalOpen.value = false;
  submitted.value = false;
  selectedAppointmentTypeId.value = null;
}

async function saveAppointmentType() {
  submitted.value = true;

  if (!upsertData.value.name || upsertData.value.price === null || upsertData.value.durationMinutes === null) {
    notificationStore.show({ type: 'error', message: 'Vyplňte prosím všechna povinná pole (Název, Cena, Délka).' });
    return;
  }
  if (upsertData.value.price < 0) {
    notificationStore.show({ type: 'error', message: 'Cena nemůže být záporná.' });
    return;
  }
   if (upsertData.value.durationMinutes <= 0) {
    notificationStore.show({ type: 'error', message: 'Délka musí být kladné číslo.' });
    return;
  }

  saving.value = true;

  const payload: CreateAppointmentTypeRequest | UpdateAppointmentTypeRequest = {
    ...upsertData.value,
    visibleToSpecificConsultantIds: upsertData.value.visibleToAll ? [] : parseConsultantIds(visibleToSpecificConsultantIdsString.value),
  };
  // Odebereme pole, pokud je prázdné a API by ho neočekávalo, např. description
  if (!payload.description) {
    delete payload.description;
  }


  try {
    if (isEditing.value && selectedAppointmentTypeId.value !== null) {
      await $api.put(`/appointment-types/${selectedAppointmentTypeId.value}`, payload as UpdateAppointmentTypeRequest);
      notificationStore.show({ type: 'success', message: 'Typ schůzky byl úspěšně aktualizován.' });
    } else {
      await $api.post('/appointment-types', payload as CreateAppointmentTypeRequest);
      notificationStore.show({ type: 'success', message: 'Nový typ schůzky byl úspěšně vytvořen.' });
    }
    closeUpsertModal();
    fetchAppointmentTypes(); // Refresh data in table
  } catch (error: any) {
    console.error('Failed to save appointment type:', error);
    notificationStore.show({ 
      type: 'error', 
      message: error.response?.data?.message || 'Nepodařilo se uložit typ schůzky.' 
    });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(item: AppointmentType) {
  console.log('Confirm delete for:', item);
  // Zde by se mělo použít `useConfirm` od PrimeVue nebo UConfirmModal
  // Příklad s PrimeVue useConfirm:
  // const confirm = useConfirm();
  // confirm.require({ ... });
  notificationStore.show({ type: 'info', message: 'Funkce smazání bude implementována.'});
}

useHead({
  title: 'Správa typů schůzek',
});

definePageMeta({
  middleware: 'auth',
});
</script>

<style scoped>
/* Přidání scoped stylů, pokud je to potřeba pro doladění */
:deep(.p-card .p-card-body) {
  padding: 0;
}

:deep(.p-card .p-card-content) {
  padding: 0;
}

/* Zajistí, že truncate bude fungovat správně v buňce tabulky */
:deep(.p-datatable .p-datatable-tbody > tr > td) {
  overflow: hidden;
}

/* Oprava pro InputNumber v dialogu, aby neměl extra padding pokud je :invalid */
:deep(.p-inputnumber-input.p-invalid) {
    padding-right: 0.75rem !important; /* Nebo dle potřeby, aby se vešel text */
}
</style> 