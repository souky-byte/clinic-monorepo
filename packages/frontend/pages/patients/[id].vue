<template>
  <div class="page-container p-4 md:p-6">
    <div v-if="loading && !patient" class="text-center py-10">
      <ProgressSpinner />
      <p class="mt-2">Načítám údaje o pacientovi...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <Message severity="error">
        Nepodařilo se načíst údaje o pacientovi: {{ error.message || error }}
      </Message>
      <Button label="Zpět na seznam pacientů" icon="pi pi-arrow-left" class="mt-4 p-button-secondary" @click="goBack" />
    </div>

    <div v-else-if="patient">
      <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-4 bg-transparent p-0" />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Patient Details Card -->
        <div class="md:col-span-1">
          <Card class="h-full shadow-md">
            <template #title>
              <div class="flex items-center justify-between">
                <span class="text-xl font-semibold">Karta pacienta</span>
                <!-- <Button icon="pi pi-pencil" outlined rounded severity="secondary" @click="editPatient" /> -->
              </div>
            </template>
            <template #content>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500">Jméno a příjmení</label>
                  <p class="text-lg font-semibold text-gray-800">{{ patient.name }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Email</label>
                  <p class="text-gray-700">{{ patient.email || '-' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Telefon</label>
                  <p class="text-gray-700">{{ patient.phone || '-' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Adresa</label>
                  <p class="text-gray-700">{{ patient.address || '-' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Datum narození</label>
                  <p class="text-gray-700">{{ patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '-' }}</p>
                </div>
                <div v-if="patient.consultant">
                  <label class="block text-sm font-medium text-gray-500">Ošetřující konzultant</label>
                  <p class="text-gray-700">{{ patient.consultant.name }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Poznámky</label>
                  <p class="text-gray-700 whitespace-pre-wrap">{{ patient.notes || '-' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500">Celkem utraceno</label>
                  <p class="text-lg font-semibold text-primary-600">{{ formatPrice(patient.totalSpent) }}</p>
                </div>
                 <div>
                  <label class="block text-sm font-medium text-gray-500">Poslední návštěva</label>
                  <p class="text-gray-700">{{ patient.lastVisit ? formatDate(patient.lastVisit) : 'Nezaznamenáno' }}</p>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Timeline and Other Data -->
        <div class="md:col-span-2 space-y-6">
          <Card class="shadow-md">
            <template #title><span class="text-xl font-semibold">Časová osa pacienta</span></template>
            <template #content>
              <div v-if="timelineLoading" class="text-center py-5">
                <ProgressSpinner style="width:30px; height:30px" />
                <p class="mt-1 text-sm">Načítám historii...</p>
              </div>
              <Timeline v-else-if="sortedTimelineEvents.length > 0" :value="sortedTimelineEvents" align="alternate" class="customized-timeline">
                  <template #marker="slotProps">
                      <span class="custom-marker shadow-md border-circle" :style="{ backgroundColor: slotProps.item.color }">
                          <i :class="slotProps.item.icon" class="p-2"></i>
                      </span>
                  </template>
                  <template #content="slotProps">
                      <Card class="mb-3 shadow-sm">
                          <template #title>
                            <span class="font-semibold text-md">{{ slotProps.item.title }}</span>
                          </template>
                           <template #subtitle>
                              <span class="text-sm text-gray-600">{{ formatDate(slotProps.item.date, true) }}</span>
                          </template>
                          <template #content>
                              <p class="text-sm">{{ slotProps.item.description }}</p>
                              <div v-if="slotProps.item.details">
                                <ul class="list-disc list-inside text-sm mt-1">
                                  <li v-for="(detail, index) in slotProps.item.details" :key="index">{{ detail }}</li>
                                </ul>
                              </div>
                              <div v-if="slotProps.item.amount" class="mt-2 text-sm font-medium">
                                Částka: {{ formatPrice(slotProps.item.amount) }}
                              </div>
                          </template>
                      </Card>
                  </template>
              </Timeline>
              <p v-else class="text-center text-gray-500 py-5">Pacient zatím nemá žádné záznamy v historii.</p>
            </template>
          </Card>
          
          <!-- Placeholder for Purchases Table -->
          <Card class="shadow-md">
            <template #title><span class="text-xl font-semibold">Historie nákupů</span></template>
            <template #content>
              <DataTable :value="purchases" :loading="purchasesLoading" paginator :rows="5" responsiveLayout="scroll">
                <Column field="purchaseDate" header="Datum nákupu" sortable>
                  <template #body="slotProps">{{ formatDate(slotProps.data.purchaseDate) }}</template>
                </Column>
                <Column field="totalAmount" header="Celková částka" sortable>
                  <template #body="slotProps">{{ formatPrice(slotProps.data.totalAmount) }}</template>
                </Column>
                <Column field="items.length" header="Počet položek">
                    <template #body="slotProps">{{ slotProps.data.items?.length || 0 }}</template>
                </Column>
                <Column field="notes" header="Poznámky"></Column>
                <!-- TODO: Expandable row for items or detail button -->
              </DataTable>
               <p v-if="!purchasesLoading && (!purchases || purchases.length === 0)" class="text-center text-gray-500 py-3">Žádné nákupy k zobrazení.</p>
            </template>
          </Card>

          <!-- Placeholder for Appointments Table -->
          <Card class="shadow-md">
            <template #title><span class="text-xl font-semibold">Historie schůzek</span></template>
            <template #content>
              <DataTable :value="appointments" :loading="appointmentsLoading" paginator :rows="5" responsiveLayout="scroll">
                <Column field="date" header="Datum schůzky" sortable>
                  <template #body="slotProps">{{ formatDate(slotProps.data.date, true) }}</template>
                </Column>
                <Column field="appointmentType.name" header="Typ schůzky"></Column>
                <Column field="consultant.name" header="Konzultant"></Column>
                <Column field="status" header="Status">
                  <template #body="slotProps">
                    <Tag :value="slotProps.data.status" :severity="getAppointmentStatusSeverity(slotProps.data.status)" />
                  </template>
                </Column>
                <Column field="notes" header="Poznámky"></Column>
              </DataTable>
               <p v-if="!appointmentsLoading && (!appointments || appointments.length === 0)" class="text-center text-gray-500 py-3">Žádné schůzky k zobrazení.</p>
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
// PrimeVue components will be auto-imported by Nuxt module

// Assuming useApiService is globally available or auto-imported
// import { useApiService } from '~/composables/useApiService'; 

// Define interfaces based on Swagger (simplified for brevity here)
interface User {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

interface Patient {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  consultant?: User | null;
  consultantId: number;
  lastVisit?: string | null;
  totalSpent: string | number; // Swagger has string, might be number
  createdAt: string;
  updatedAt: string;
}

interface PurchaseItem {
  inventoryItemId: number;
  inventoryItem?: { name: string }; // Simplified
  quantity: number;
  priceAtPurchase: string | number;
}

interface Purchase {
  id: number;
  purchaseDate: string;
  totalAmount: string | number;
  notes?: string | null;
  items: PurchaseItem[];
}

interface Appointment {
  id: number;
  date: string;
  appointmentType: { name: string };
  consultant: { name: string };
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string | null;
  appointmentProducts?: { inventoryItem: { name: string }, quantity: number }[]; // Simplified
}

interface TimelineEvent {
  id: string; // Unique ID for v-for (e.g., 'purchase-1' or 'appointment-1')
  type: 'purchase' | 'appointment';
  date: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  details?: string[];
  amount?: string | number;
}

const route = useRoute();
const router = useRouter();
const { $api } = useApiService(); // Make sure this composable is correctly set up

const patient = ref<Patient | null>(null);
const purchases = ref<Purchase[]>([]);
const appointments = ref<Appointment[]>([]);

const loading = ref(true);
const error = ref<any>(null);

const purchasesLoading = ref(false);
const appointmentsLoading = ref(false);
const timelineLoading = ref(false);

const patientId = computed(() => route.params.id as string);

const breadcrumbHome = ref({ icon: 'pi pi-home', to: '/' });
const breadcrumbItems = computed(() => [
  { label: 'Pacienti', to: '/patients' },
  { label: patient.value?.name || 'Detail pacienta' }
]);

// Helper functions (formatDate, formatPrice, getAppointmentStatusSeverity)
const formatDate = (dateString: string | undefined | null, includeTime = false): string => {
  if (!dateString) return '-';
  try {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
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
  let numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return '- Kč';
  return `${numericPrice.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}`;
};

const getAppointmentStatusSeverity = (status: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'upcoming': return 'info';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
};


async function fetchPatientDetails() {
  loading.value = true;
  error.value = null;
  try {
    // Swagger: GET /patients/{id} -> /api/patients/{id}
    // User mentioned /api is global, so path should be /patients/{id}
    const response = await $api.get<Patient>(`/patients/${patientId.value}`);
    patient.value = response.data;
  } catch (err: any) {
    console.error("Error fetching patient details:", err);
    error.value = err.response?.data || err;
  } finally {
    loading.value = false;
  }
}

async function fetchPatientPurchases() {
  if (!patientId.value) return;
  purchasesLoading.value = true;
  try {
    // Swagger: GET /patients/{id}/purchases -> /api/patients/{id}/purchases
    const response = await $api.get<{ data: Purchase[], meta: any }>(`/patients/${patientId.value}/purchases`, { params: { limit: 100, sortBy: 'purchaseDate', sortOrder: 'DESC' } }); // Fetch more for timeline initially
    purchases.value = response.data.data;
  } catch (err) {
    console.error("Error fetching patient purchases:", err);
    // Handle error (e.g., show notification)
  } finally {
    purchasesLoading.value = false;
  }
}

async function fetchPatientAppointments() {
  if (!patientId.value) return;
  appointmentsLoading.value = true;
  try {
    // Swagger: GET /patients/{id}/appointments -> /api/patients/{id}/appointments
    const response = await $api.get<{ data: Appointment[], meta: any }>(`/patients/${patientId.value}/appointments`, { params: { limit: 100, sortBy: 'date', sortOrder: 'DESC' } }); // Fetch more for timeline initially
    appointments.value = response.data.data;
  } catch (err) {
    console.error("Error fetching patient appointments:", err);
  } finally {
    appointmentsLoading.value = false;
  }
}

const sortedTimelineEvents = computed<TimelineEvent[]>(() => {
  const events: TimelineEvent[] = [];

  purchases.value.forEach(p => {
    events.push({
      id: `purchase-${p.id}`,
      type: 'purchase',
      date: p.purchaseDate,
      title: 'Nákup produktů',
      description: p.notes || `Počet položek: ${p.items?.length || 0}`,
      icon: 'pi pi-shopping-cart',
      color: '#6366F1', // Indigo
      amount: p.totalAmount,
      details: p.items?.map(item => `${item.inventoryItem?.name || 'Produkt'} (${item.quantity} ks)`)
    });
  });

  appointments.value.forEach(a => {
    events.push({
      id: `appointment-${a.id}`,
      type: 'appointment',
      date: a.date,
      title: `Schůzka: ${a.appointmentType.name}`,
      description: a.notes || `Konzultant: ${a.consultant.name}`,
      icon: 'pi pi-calendar',
      color: '#10B981', // Emerald
      details: a.appointmentProducts?.map(ap => `${ap.inventoryItem?.name || 'Produkt'} (${ap.quantity} ks)`),
      // Could add appointment total price if relevant
    });
  });
  
  // Sort by date, most recent first for timeline display often looks good, but chronological (oldest first) is standard
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});


onMounted(async () => {
  if (patientId.value) {
    await fetchPatientDetails();
    // If patient details loaded successfully, fetch related data
    if (patient.value) {
      timelineLoading.value = true;
      await Promise.all([
        fetchPatientPurchases(),
        fetchPatientAppointments()
      ]);
      timelineLoading.value = false;
    }
  } else {
    error.value = { message: 'Chybí ID pacienta.' };
    loading.value = false;
  }
});

function goBack() {
  router.push('/patients');
}

</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.customized-timeline .p-timeline-event-opposite {
  flex: 0; /* Remove the opposite content space for alternate layout if not used */
  padding: 0;
}

.custom-marker {
    display: flex;
    width: 2.5rem;
    height: 2.5rem;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    border-radius: 50%;
    z-index: 1;
}
.p-timeline-event-content, .p-timeline-event-opposite {
    line-height: 1;
}
/* Ensure cards in timeline don't have excessive padding if not needed */
.customized-timeline .p-card .p-card-body {
  padding: 1rem;
}
.customized-timeline .p-card .p-card-title {
  font-size: 1.1rem; /* Adjusted title size */
  margin-bottom: 0.25rem;
}
.customized-timeline .p-card .p-card-subtitle {
  margin-bottom: 0.5rem;
}

/* Style adjustments for better visual hierarchy */
label.block {
  color: #4B5563; /* Slightly darker gray for labels */
}
p.text-gray-700, p.text-gray-800 {
  margin-top: 0.1rem; /* Small space between label and value */
}
.whitespace-pre-wrap {
  white-space: pre-wrap; /* Ensures notes with line breaks are displayed correctly */
}
</style> 