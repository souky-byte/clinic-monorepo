<template>
  <div class="page-container p-4 md:p-6">
    <div v-if="loading && !appointment" class="text-center py-10">
      <ProgressSpinner />
      <p class="mt-2">Načítám údaje o schůzce...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <Message severity="error" :closable="false">
        Nepodařilo se načíst údaje o schůzce: {{ error.message || error }}
      </Message>
      <Button label="Zpět na seznam schůzek" icon="pi pi-arrow-left" class="mt-4 p-button-secondary" @click="goBack" />
    </div>

    <div v-else-if="appointment">
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-4 bg-transparent p-0" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Main Details & Consultant -->
        <div class="lg:col-span-1 flex flex-col gap-6">
          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Detail schůzky</span>
            </template>
            <template #content>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-500">Datum a čas</label>
                  <p class="text-lg font-semibold text-gray-800">{{ formatDate(appointment.date, true) }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Typ schůzky</label>
                  <p class="text-gray-700">{{ appointment.appointmentType?.name || 'N/A' }}</p>
                </div>
                 <div>
                  <label class="block text-sm font-medium text-gray-500">Status</label>
                  <Tag :value="appointment.status" :severity="getAppointmentStatusSeverity(appointment.status)" class="text-sm" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Celková cena</label>
                  <p class="text-lg font-semibold text-primary-600">{{ formatPrice(appointment.totalPrice) }}</p>
                </div>
              </div>
            </template>
          </Card>

          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Pacient</span>
            </template>
            <template #content>
              <!-- Assuming appointment.patient is an object with name and id -->
              <NuxtLink v-if="appointment.patient && typeof appointment.patient === 'object' && appointment.patient.id" :to="`/patients/${appointment.patient.id}`" class="text-primary-600 hover:underline font-semibold">
                {{ appointment.patient.name }}
              </NuxtLink>
              <!-- Fallback for string or object without id -->
              <p v-else class="text-gray-700">{{ typeof appointment.patient === 'string' ? appointment.patient : (appointment.patient?.name || 'N/A') }}</p>
            </template>
          </Card>

          <Card class="shadow-md">
            <template #title>
              <span class="text-xl font-semibold">Konzultant</span>
            </template>
            <template #content>
              <p class="text-gray-700">{{ appointment.consultant?.name || 'N/A' }}</p>
              <p v-if="appointment.consultant?.email" class="text-sm text-gray-500">{{ appointment.consultant.email }}</p>
            </template>
          </Card>
        </div>

        <!-- Right Column: Products & Notes -->
        <div class="lg:col-span-2 flex flex-col gap-6">
          <Card class="shadow-md" v-if="appointment.appointmentProducts && appointment.appointmentProducts.length > 0">
            <template #title>
              <span class="text-xl font-semibold">Zakoupené produkty</span>
            </template>
            <template #content>
              <DataTable :value="appointment.appointmentProducts" responsiveLayout="scroll">
                <Column field="inventoryItem.name" header="Produkt"></Column>
                <Column field="quantity" header="Množství" style="width: 100px" headerClass="text-center" bodyClass="text-center"></Column>
                <Column field="priceAtTimeOfBooking" header="Cena/ks (při rez.)" style="width: 150px">
                  <template #body="slotProps">
                    {{ formatPrice(slotProps.data.priceAtTimeOfBooking) }}
                  </template>
                </Column>
                <Column field="vatRateAtTimeOfBooking" header="DPH (%)" style="width: 100px" headerClass="text-center" bodyClass="text-center">
                    <template #body="slotProps">
                        {{ slotProps.data.vatRateAtTimeOfBooking }}%
                    </template>
                </Column>
                <Column header="Subtotal" style="width: 150px">
                    <template #body="slotProps">
                        {{ formatPrice(calculateProductSubtotal(slotProps.data)) }}
                    </template>
                </Column>
              </DataTable>
            </template>
          </Card>
           <Card v-else class="shadow-md">
            <template #title><span class="text-xl font-semibold">Zakoupené produkty</span></template>
            <template #content>
                <p class="text-gray-500">K této schůzce nebyly zakoupeny žádné produkty.</p>
            </template>
           </Card>


          <Card class="shadow-md" v-if="appointment.notes">
            <template #title>
              <span class="text-xl font-semibold">Poznámky ke schůzce</span>
            </template>
            <template #content>
              <p class="text-gray-700 whitespace-pre-wrap">{{ appointment.notes }}</p>
            </template>
          </Card>
           <Card v-else class="shadow-md">
            <template #title><span class="text-xl font-semibold">Poznámky ke schůzce</span></template>
            <template #content>
                <p class="text-gray-500">K této schůzce nejsou žádné poznámky.</p>
            </template>
           </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Interfaces based on provided Swagger and sample response
interface UserLite { // For consultant
  id: number;
  name: string;
  email?: string;
}

interface PatientLite { // For patient link
  id: number;
  name: string;
}

interface AppointmentTypeLite {
  id: number;
  name: string;
  price?: number; // Price of the appointment type itself
}

interface InventoryItemLite {
  id: number;
  name: string;
}

interface AppointmentProductItem {
  id: number;
  inventoryItemId: number;
  inventoryItem: InventoryItemLite;
  quantity: number;
  priceAtTimeOfBooking: string | number; // Assuming this is price WITHOUT VAT per unit
  vatRateAtTimeOfBooking: string | number; // Percentage
}

interface Appointment {
  id: number;
  patientId: number;
  patient: PatientLite | string; // Sample shows string, Swagger shows Patient object. Handling both.
  appointmentTypeId: number;
  appointmentType: AppointmentTypeLite;
  consultantId: number;
  consultant: UserLite;
  date: string;
  notes?: string | null;
  appointmentProducts?: AppointmentProductItem[];
  totalPrice: string | number; // Grand total for the appointment
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const route = useRoute();
const router = useRouter();
const { $api } = useApiService(); // Ensure useApiService is correctly set up

const appointment = ref<Appointment | null>(null);
const loading = ref(true);
const error = ref<any>(null);

const appointmentId = computed(() => route.params.id as string);

const breadcrumbHome = ref({ icon: 'pi pi-home', to: '/' });
const breadcrumbItems = computed(() => [
  { label: 'Schůzky', to: '/appointments' },
  { label: appointment.value ? `Schůzka #${appointment.value.id}` : 'Detail schůzky' }
]);

// Helper Functions
const formatDate = (dateString: string | undefined | null, includeTime = false): string => {
  if (!dateString) return '-';
  try {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('cs-CZ', options);
  } catch (e) {
    return String(dateString);
  }
};

const formatPrice = (price: string | number | undefined | null): string => {
  if (price === undefined || price === null) return '- Kč';
  let numericPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(numericPrice)) return '- Kč';
  return `${numericPrice.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}`;
};

const getAppointmentStatusSeverity = (status: string | undefined) => {
  switch (status) {
    case 'completed': return 'success';
    case 'upcoming': return 'info';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
};

const calculateProductSubtotal = (productItem: AppointmentProductItem): number => {
    const price = typeof productItem.priceAtTimeOfBooking === 'string' ? parseFloat(productItem.priceAtTimeOfBooking) : productItem.priceAtTimeOfBooking;
    const vat = typeof productItem.vatRateAtTimeOfBooking === 'string' ? parseFloat(productItem.vatRateAtTimeOfBooking) : productItem.vatRateAtTimeOfBooking;
    if (isNaN(price) || isNaN(vat)) return 0;
    return productItem.quantity * price * (1 + vat / 100);
};

async function fetchAppointmentDetails() {
  loading.value = true;
  error.value = null;
  try {
    // Endpoint: GET /appointments/{id}
    // Assuming $api handles the /api prefix if necessary
    const response = await $api.get<Appointment>(`/appointments/${appointmentId.value}`);
    appointment.value = response.data;
  } catch (err: any) {
    console.error("Error fetching appointment details:", err);
    error.value = err.response?.data || err;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (appointmentId.value) {
    fetchAppointmentDetails();
  } else {
    error.value = { message: 'Chybí ID schůzky.' };
    loading.value = false;
  }
});

function goBack() {
  router.push('/appointments');
}
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

label.block {
  color: #4B5563; /* Slightly darker gray for labels */
}
p.text-gray-700, p.text-gray-800, p.text-primary-600 {
  margin-top: 0.1rem; /* Small space between label and value */
}
.whitespace-pre-wrap {
  white-space: pre-wrap; /* Ensures notes with line breaks are displayed correctly */
}
</style> 