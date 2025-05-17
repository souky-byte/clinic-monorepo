<template>
  <div class="page-container p-4 md:p-6">
    <div v-if="loading && !editableAppointment" class="text-center py-10">
      <ProgressSpinner />
      <p class="mt-2">Načítám údaje o schůzce...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <Message severity="error" :closable="false">
        Nepodařilo se načíst údaje o schůzce: {{ error.message || error }}
      </Message>
      <Button label="Zpět na seznam schůzek" icon="pi pi-arrow-left" class="mt-4 p-button-secondary" @click="goBackToAppointmentsList" />
    </div>

    <div v-else-if="editableAppointment">
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-6 bg-transparent p-0" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Main Details & Consultant -->
        <div class="lg:col-span-1 flex flex-col gap-6">
          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Vedení schůzky</span>
            </template>
            <template #content>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Datum a čas</label>
                  <p class="text-gray-700">{{ formatDate(editableAppointment.date, true) }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Typ schůzky</label>
                  <p class="text-gray-700">{{ editableAppointment.appointmentType?.name || 'N/A' }}</p>
                </div>
                 <div>
                  <label for="appointmentStatus" class="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <Dropdown 
                    id="appointmentStatus"
                    v-model="editableAppointment.status" 
                    :options="appointmentStatusOptions" 
                    optionLabel="label" 
                    optionValue="value" 
                    placeholder="Vyberte status"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Celková cena</label>
                  <p class="text-lg font-semibold text-primary-600">{{ formatPrice(editableAppointment.totalPrice) }}</p>
                </div>
              </div>
            </template>
          </Card>

          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Pacient</span>
            </template>
            <template #content>
              <NuxtLink v-if="editableAppointment.patient && typeof editableAppointment.patient === 'object' && editableAppointment.patient.id" :to="`/patients/${editableAppointment.patient.id}`" class="text-primary-600 hover:underline font-semibold">
                {{ editableAppointment.patient.name }}
              </NuxtLink>
              <p v-else class="text-gray-700">{{ typeof editableAppointment.patient === 'string' ? editableAppointment.patient : (editableAppointment.patient?.name || 'N/A') }}</p>
            </template>
          </Card>

          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Konzultant</span>
            </template>
            <template #content>
              <p class="text-gray-700">{{ editableAppointment.consultant?.name || 'N/A' }}</p>
              <p v-if="editableAppointment.consultant?.email" class="text-sm text-gray-500">{{ editableAppointment.consultant.email }}</p>
            </template>
          </Card>
        </div>

        <!-- Right Column: Products & Notes -->
        <div class="lg:col-span-2 flex flex-col gap-6">
          <Card class="shadow-md">
            <template #title>
              <div class="flex justify-between items-center">
                <span class="text-xl font-semibold">Zakoupené produkty</span>
                <!-- <Button icon="pi pi-plus" label="Přidat produkt" severity="contrast" size="small" @click="openAddProductDialog" /> -->
                <!-- Placeholder for future add product button -->
              </div>
            </template>
            <template #content>
              <div v-if="editableAppointment.appointmentProducts && editableAppointment.appointmentProducts.length > 0">
                <DataTable :value="editableAppointment.appointmentProducts" responsiveLayout="scroll" size="small">
                  <Column field="inventoryItem.name" header="Produkt"></Column>
                  <Column field="quantity" header="Množství" style="width: 100px" headerClass="text-center" bodyClass="text-center"></Column>
                  <Column field="priceAtTimeOfBooking" header="Cena/ks" style="width: 120px">
                    <template #body="slotProps">
                      {{ formatPrice(slotProps.data.priceAtTimeOfBooking) }}
                    </template>
                  </Column>
                  <Column field="vatRateAtTimeOfBooking" header="DPH (%)" style="width: 100px" headerClass="text-center" bodyClass="text-center">
                      <template #body="slotProps">
                          {{ slotProps.data.vatRateAtTimeOfBooking }}%
                      </template>
                  </Column>
                  <Column header="Subtotal" style="width: 130px">
                      <template #body="slotProps">
                          {{ formatPrice(calculateProductSubtotal(slotProps.data)) }}
                      </template>
                  </Column>
                  <!-- TODO: Action to remove product from appointment? -->
                </DataTable>
              </div>
              <p v-else class="text-gray-500">K této schůzce nebyly zatím přiřazeny žádné produkty.</p>
              <div class="mt-4 p-4 border border-dashed border-gray-300 rounded-md">
                 <p class="text-center text-gray-500 text-sm">Funkcionalita přidání produktu na schůzce bude implementována zde.</p>
              </div>
            </template>
          </Card>

          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Poznámky ke schůzce</span>
            </template>
            <template #content>
              <Textarea v-model="editableAppointment.notes" autoResize rows="5" class="w-full" placeholder="Zadejte poznámky..." />
            </template>
          </Card>

          <div class="flex justify-end gap-2 mt-2">
            <Button label="Zrušit" severity="secondary" text @click="goBackToAppointmentsList" />
            <Button label="Uložit změny" icon="pi pi-check" @click="saveAppointmentChanges" :loading="saving" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';

// PrimeVue components (auto-imported)
// import ProgressSpinner from 'primevue/progressspinner';
// import Message from 'primevue/message';
// import Button from 'primevue/button';
// import Breadcrumb from 'primevue/breadcrumb';
// import Card from 'primevue/card';
// import Tag from 'primevue/tag';
// import DataTable from 'primevue/datatable';
// import Column from 'primevue/column';
// import Textarea from 'primevue/textarea';
// import Dropdown from 'primevue/dropdown';


// --- Interfaces (similar to detail page, ensure they match API response/payload for PUT) ---
interface UserLite { id: number; name: string; email?: string;}
interface PatientLite { id: number; name: string; }
interface AppointmentTypeLite { id: number; name: string; price?: number; }
interface InventoryItemLite { id: number; name: string; }

interface AppointmentProductItem {
  id?: number; // May not have ID if newly added client-side
  inventoryItemId: number;
  inventoryItem?: InventoryItemLite; // Optional for display
  quantity: number;
  priceAtTimeOfBooking: string | number;
  vatRateAtTimeOfBooking: string | number;
}

// Interface for the editable appointment data
// Note: For PUT /appointments/{id}, check Swagger for exact payload.
// Typically, you'd send only changed fields, or a subset of fields.
interface EditableAppointmentData {
  id: number;
  patientId?: number;
  patient?: PatientLite | string; 
  appointmentTypeId?: number;
  appointmentType?: AppointmentTypeLite;
  consultantId?: number;
  consultant?: UserLite;
  date?: string;
  notes?: string | null;
  appointmentProducts?: AppointmentProductItem[];
  totalPrice?: string | number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show'; // Ensure all statuses are here
  // Add other fields from the GET /appointments/{id} response that might be part of the PUT payload or needed for display
}

const route = useRoute();
const router = useRouter();
const { $api } = useApiService();
const notificationStore = useNotificationStore();

const editableAppointment = ref<EditableAppointmentData | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref<any>(null);

const appointmentId = computed(() => route.params.id as string);

const appointmentStatusOptions = ref([
  { label: 'Naplánováno', value: 'scheduled' },
  { label: 'Probíhá', value: 'in-progress' },
  { label: 'Dokončeno', value: 'completed' },
  { label: 'Zrušeno', value: 'cancelled' },
  { label: 'Přeplánováno', value: 'rescheduled' },
  { label: 'Nedostavil se', value: 'no-show' },
]);


const breadcrumbHome = ref({ icon: 'pi pi-home', to: '/' });
const breadcrumbItems = computed(() => [
  { label: 'Schůzky', to: '/appointments' },
  { label: editableAppointment.value ? `Vedení schůzky #${editableAppointment.value.id}` : 'Vedení schůzky' }
]);

// --- Helper Functions (can be imported from a utils file if shared) ---
const formatDate = (dateString: string | undefined | null, includeTime = false): string => {
  if (!dateString) return '-';
  try {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return new Date(dateString).toLocaleDateString('cs-CZ', options);
  } catch (e) { return String(dateString); }
};

const formatPrice = (price: string | number | undefined | null): string => {
  if (price === undefined || price === null) return '- Kč';
  let numericPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(numericPrice)) return '- Kč';
  return `${numericPrice.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}`;
};

// For displaying status tag, if needed elsewhere (already in index)
/*
const getAppointmentStatusSeverity = (status: string | undefined) => {
  // ... (same as in appointments/index.vue or a shared util)
};
*/

const calculateProductSubtotal = (productItem: AppointmentProductItem): number => {
    const price = typeof productItem.priceAtTimeOfBooking === 'string' ? parseFloat(productItem.priceAtTimeOfBooking) : productItem.priceAtTimeOfBooking;
    const vat = typeof productItem.vatRateAtTimeOfBooking === 'string' ? parseFloat(productItem.vatRateAtTimeOfBooking) : productItem.vatRateAtTimeOfBooking;
    if (isNaN(price) || isNaN(vat) || productItem.quantity === undefined) return 0;
    return productItem.quantity * price * (1 + vat / 100);
};


// --- Data Fetching & Saving ---
async function fetchAppointmentDetails() {
  loading.value = true;
  error.value = null;
  try {
    const response = await $api.get<EditableAppointmentData>(`/appointments/${appointmentId.value}`);
    editableAppointment.value = response.data;
     // If status is 'scheduled', automatically change to 'in-progress' when opening this page?
    if (editableAppointment.value && editableAppointment.value.status === 'scheduled') {
      editableAppointment.value.status = 'in-progress';
      // Optionally, immediately save this status change or wait for user to save all changes
      // For now, just changing client-side.
    }
  } catch (err: any) {
    console.error("Error fetching appointment details for edit:", err);
    error.value = err.response?.data || err;
  } finally {
    loading.value = false;
  }
}

async function saveAppointmentChanges() {
  if (!editableAppointment.value) return;
  saving.value = true;
  error.value = null;

  // Construct payload for PUT request - refer to Swagger for /appointments/{id} PUT
  // It might expect only the fields that can be updated, e.g., notes, status, products.
  const payload = {
    notes: editableAppointment.value.notes,
    status: editableAppointment.value.status,
    // appointmentProducts: editableAppointment.value.appointmentProducts // Handle products update later
  };

  try {
    await $api.put(`/appointments/${appointmentId.value}`, payload);
    notificationStore.show({ type: 'success', message: 'Změny ve schůzce byly úspěšně uloženy.' });
    // Optionally, refetch data or navigate away
    // router.push(`/appointments/${appointmentId.value}`); // Go to detail view
    fetchAppointmentDetails(); // Re-fetch to confirm changes and get latest state
  } catch (err: any) {
    console.error("Error saving appointment changes:", err);
    error.value = err.response?.data || err;
    notificationStore.show({ type: 'error', message: 'Nepodařilo se uložit změny: ' + (err.response?.data?.message || err.message) });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (appointmentId.value) {
    fetchAppointmentDetails();
  } else {
    error.value = { message: 'Chybí ID schůzky.' };
    loading.value = false;
    notificationStore.show({type: 'error', message: 'Nelze načíst schůzku bez ID.'});
    router.push('/appointments');
  }
});

function goBackToAppointmentsList() {
  router.push('/appointments');
}

// TODO: Placeholder for add product dialog
// function openAddProductDialog() { ... }

</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}
label.block {
  color: #4B5563; 
  font-weight: 500;
}
p.text-gray-700, p.text-gray-800, p.text-primary-600 {
  margin-top: 0.1rem; 
}
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style> 