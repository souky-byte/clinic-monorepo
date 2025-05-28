<template>
  <div class="p-4 md:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Přidat nového pacienta</h1>
      <Button label="Zpět na seznam" icon="pi pi-arrow-left" @click="goBack" severity="secondary" outlined />
    </div>

    <Card class="shadow-md">
      <template #content>
        <form @submit.prevent="addPatient" class="space-y-6">
          <div class="p-fluid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div class="md:col-span-2">
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Jméno a příjmení *</label>
              <InputText id="name" v-model="newPatientData.name" :invalid="submitted && !newPatientData.name" class="w-full" />
              <small v-if="submitted && !newPatientData.name" class="p-error">Jméno je povinné.</small>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <InputText id="email" v-model="newPatientData.email" type="email" class="w-full" />
            </div>
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <InputText id="phone" v-model="newPatientData.phone" type="tel" class="w-full" />
            </div>
            
            <div class="md:col-span-2">
              <label for="address" class="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
              <Textarea id="address" v-model="newPatientData.address" rows="3" class="w-full" autoResize />
            </div>

            <div>
              <label for="dateOfBirth" class="block text-sm font-medium text-gray-700 mb-1">Datum narození</label>
              <Calendar id="dateOfBirth" v-model="newPatientData.dateOfBirth" dateFormat="dd.mm.yy" showIcon class="w-full" placeholder="DD.MM.RRRR" :inputClass="'w-full'"/>
            </div>
            <div>
              <label for="consultantId" class="block text-sm font-medium text-gray-700 mb-1">Přiřazený konzultant *</label>
              <Dropdown 
                id="consultantId" 
                v-model="newPatientData.consultantId" 
                :options="consultantsList" 
                optionLabel="name" 
                optionValue="id" 
                placeholder="Vyberte konzultanta" 
                class="w-full"
                :invalid="submitted && newPatientData.consultantId === null"
              />
              <small v-if="submitted && newPatientData.consultantId === null" class="p-error">Konzultant je povinný.</small>
            </div>
          </div>

          <div class="md:col-span-2">
            <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
            <Textarea id="notes" v-model="newPatientData.notes" rows="4" class="w-full" autoResize />
          </div>

          <div class="pt-4 flex justify-end space-x-3">
            <Button label="Zrušit" icon="pi pi-times" severity="secondary" text @click="goBack" />
            <Button type="submit" label="Uložit pacienta" icon="pi pi-check" />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';

// PrimeVue components - auto-imported by nuxt-primevue
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Card from 'primevue/card';

definePageMeta({
  middleware: 'auth',
});

interface CreatePatientDto {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: Date | null; // Changed to Date | null for Calendar v-model
  consultantId: number | null;
  notes?: string | null;
}

interface Consultant {
  id: number;
  name: string;
}

const { $api } = useApiService();
const notificationStore = useNotificationStore();
const router = useRouter();

const newPatientData = reactive<CreatePatientDto>({
  name: '',
  email: null,
  phone: null,
  address: null,
  dateOfBirth: null, // Initialize as null, Calendar will provide Date object
  consultantId: null,
  notes: null,
});

const submitted = ref(false); // For validation feedback
const consultantsList = ref<Consultant[]>([]);

async function fetchConsultants() {
  try {
    const response = await $api.get('/consultants', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } });
    let rawConsultantsArray = [];
    if (response.data && Array.isArray(response.data.data)) {
        rawConsultantsArray = response.data.data;
    } else if (response.data && Array.isArray(response.data)) { 
        rawConsultantsArray = response.data;
    }
    consultantsList.value = rawConsultantsArray.map((c: any) => ({ id: c.id, name: c.name }));
  } catch (error: any) {
    console.error('[fetchConsultants] Failed to load consultants:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst konzultanty.' });
  }
}

function formatDateForAPI(date: Date | string | null): string | null {
  if (!date) return null;
  if (typeof date === 'string') { 
    // if it's from direct input or pre-filled and already a string YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    // If it's DD.MM.YYYY from user input (though Calendar should give Date object)
    const parts = date.split('.');
    if (parts.length === 3 && parts.every(p => !isNaN(parseInt(p)))) {
      // Assuming DD.MM.YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // If it's some other string format that the API might accept or needs further specific parsing
    // For now, we assume Calendar provides a Date object, or it's pre-filled YYYY-MM-DD
    // If it's an invalid string date format, it might be best to return null or throw an error
    // depending on desired strictness. Returning null if unparseable seems safer for an API.
    // However, since Calendar is used, direct string manipulation should be minimal.
    // The initial type error implies this path might be taken if newPatientData.dateOfBirth was string.
    // With newPatientData.dateOfBirth as Date | null, this branch is less likely from Calendar.
    return null; // Or handle as an error / return original string if API is flexible
  }
  // It's a Date object from PrimeVue Calendar
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function addPatient() {
  submitted.value = true; // Trigger validation feedback

  if (!newPatientData.name || newPatientData.consultantId === null) {
    notificationStore.show({ type: 'error', message: 'Jméno pacienta a přiřazený konzultant jsou povinná pole.' });
    return;
  }

  const payload = {
    ...newPatientData,
    consultantId: Number(newPatientData.consultantId), // Ensure it's a number
    dateOfBirth: formatDateForAPI(newPatientData.dateOfBirth || null),
  };

  try {
    const response = await $api.post('/patients', payload);
    notificationStore.show({ type: 'success', message: `Pacient ${response.data.name} byl úspěšně vytvořen.` });
    router.push('/patients');
  } catch (error: any) {
    console.error('Failed to add patient:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se přidat pacienta.' });
  }
}

function goBack() {
  router.push('/patients');
}

onMounted(() => {
  fetchConsultants();
});

</script>

<style scoped>
/* Custom styling for PrimeVue components if needed for a "fakt hezká" look */
/* For example, to ensure consistent input height if not already handled by PrimeVue/Tailwind */
:deep(.p-inputtext), 
:deep(.p-textarea), 
:deep(.p-calendar .p-inputtext), /* Target input within calendar */
:deep(.p-dropdown) {
  /* Example: Adjust height or padding if needed, though PrimeVue defaults are usually good */
  /* padding-top: 0.625rem; 
  padding-bottom: 0.625rem; */
}

:deep(.p-calendar .p-inputtext) {
    width: 100% !important;
}

/* Ensure labels and error messages have good contrast and spacing */
label {
  margin-bottom: 0.25rem; /* Slightly more space below label */
}
.p-error {
  margin-top: 0.25rem;
  display: block; /* Ensure it takes its own line */
}
</style>