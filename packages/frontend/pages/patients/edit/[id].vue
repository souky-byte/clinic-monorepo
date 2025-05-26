<template>
    <div class="p-4 md:p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900">Upravit pacienta</h1>
        <Button label="Zpět na seznam" icon="pi pi-arrow-left" @click="goBack" severity="secondary" outlined />
      </div>
  
      <Card v-if="!loadingPatientData" class="shadow-md">
        <template #content>
          <form @submit.prevent="updatePatient" class="space-y-6">
            <div class="p-fluid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div class="md:col-span-2">
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Jméno a příjmení *</label>
                <InputText id="name" v-model="patientData.name" :invalid="submitted && !patientData.name" class="w-full" />
                <small v-if="submitted && !patientData.name" class="p-error">Jméno je povinné.</small>
              </div>
  
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <InputText id="email" v-model="patientData.email" type="email" class="w-full" />
              </div>
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <InputText id="phone" v-model="patientData.phone" type="tel" class="w-full" />
              </div>
              
              <div class="md:col-span-2">
                <label for="address" class="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
                <Textarea id="address" v-model="patientData.address" rows="3" class="w-full" autoResize />
              </div>
  
              <div>
                <label for="dateOfBirth" class="block text-sm font-medium text-gray-700 mb-1">Datum narození</label>
                <Calendar id="dateOfBirth" v-model="patientData.dateOfBirth" dateFormat="dd.mm.yy" showIcon class="w-full" placeholder="DD.MM.RRRR" :inputClass="'w-full'"/>
              </div>
              <div>
                <label for="primaryConsultantId" class="block text-sm font-medium text-gray-700 mb-1">Přiřazený konzultant *</label>
                <Dropdown 
                  id="primaryConsultantId" 
                  v-model="patientData.primaryConsultantId" 
                  :options="consultantsList" 
                  optionLabel="name" 
                  optionValue="id" 
                  placeholder="Vyberte konzultanta" 
                  class="w-full"
                  :invalid="submitted && patientData.primaryConsultantId === null"
                />
                <small v-if="submitted && patientData.primaryConsultantId === null" class="p-error">Konzultant je povinný.</small>
              </div>
            </div>
  
            <div class="md:col-span-2">
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
              <Textarea id="notes" v-model="patientData.notes" rows="4" class="w-full" autoResize />
            </div>
  
            <div class="pt-4 flex justify-end space-x-3">
              <Button label="Zrušit" icon="pi pi-times" severity="secondary" text @click="goBack" />
              <Button type="submit" label="Uložit změny" icon="pi pi-check" />
            </div>
          </form>
        </template>
      </Card>
      <div v-else class="text-center">
        <ProgressSpinner />
        <p>Načítání dat pacienta...</p>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { useApiService } from '~/composables/useApiService';
  import { useNotificationStore } from '~/stores/notification';
  
  // PrimeVue components
  import InputText from 'primevue/inputtext';
  import Textarea from 'primevue/textarea';
  import Calendar from 'primevue/calendar';
  import Dropdown from 'primevue/dropdown';
  import Button from 'primevue/button';
  import Card from 'primevue/card';
  import ProgressSpinner from 'primevue/progressspinner';
  
  definePageMeta({
    middleware: 'auth',
  });
  
  interface UpdatePatientDto {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    dateOfBirth?: Date | string | null; // Calendar v-model uses Date, API might expect string
    primaryConsultantId: number | null;
    notes?: string | null;
  }
  
  interface PatientProfile extends UpdatePatientDto {
   id: number;
   // Add other fields if necessary, based on what GET /patients/:id returns
  }
  
  
  interface Consultant {
    id: number;
    name: string;
  }
  
  const { $api } = useApiService();
  const notificationStore = useNotificationStore();
  const router = useRouter();
  const route = useRoute();
  const patientId = Number(route.params.id);
  
  const patientData = reactive<UpdatePatientDto>({
    name: '',
    email: null,
    phone: null,
    address: null,
    dateOfBirth: null, 
    primaryConsultantId: null,
    notes: null,
  });
  
  const submitted = ref(false);
  const consultantsList = ref<Consultant[]>([]);
  const loadingPatientData = ref(true);
  
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
  
  function parseDateFromAPI(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    // Expects YYYY-MM-DD format from API
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    // Fallback for other formats or if parsing fails, though PrimeVue Calendar prefers Date objects
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  
  async function fetchPatientData() {
    loadingPatientData.value = true;
    try {
      const response = await $api.get<PatientProfile>(`/patients/${patientId}`);
      const fetchedPatient = response.data;
      patientData.name = fetchedPatient.name;
      patientData.email = fetchedPatient.email;
      patientData.phone = fetchedPatient.phone;
      patientData.address = fetchedPatient.address;
      patientData.dateOfBirth = parseDateFromAPI(fetchedPatient.dateOfBirth as string | null); // Convert string to Date for Calendar
      patientData.primaryConsultantId = fetchedPatient.primaryConsultantId;
      patientData.notes = fetchedPatient.notes;
    } catch (error: any) {
      console.error(`Failed to load patient data for ID ${patientId}:`, error);
      notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst data pacienta.' });
      router.push('/patients'); // Redirect if patient not found or error
    } finally {
      loadingPatientData.value = false;
    }
  }
  
  function formatDateForAPI(date: Date | string | null): string | null {
    if (!date) return null;
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date; // Already in YYYY-MM-DD
      // Attempt to parse DD.MM.YYYY if manually entered (though Calendar should give Date)
      const parts = date.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return new Date(date).toISOString().split('T')[0]; // Best effort for other string formats
    }
    // It's a Date object from PrimeVue Calendar
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  async function updatePatient() {
    submitted.value = true;
  
    if (!patientData.name || patientData.primaryConsultantId === null) {
      notificationStore.show({ type: 'error', message: 'Jméno pacienta a přiřazený konzultant jsou povinná pole.' });
      return;
    }
  
    const payload = {
      ...patientData,
      primaryConsultantId: Number(patientData.primaryConsultantId),
      dateOfBirth: formatDateForAPI(patientData.dateOfBirth),
    };
  
    try {
      const response = await $api.put(`/patients/${patientId}`, payload);
      notificationStore.show({ type: 'success', message: `Pacient ${response.data.name} byl úspěšně aktualizován.` });
      router.push('/patients');
    } catch (error: any) {
      console.error('Failed to update patient:', error);
      notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se aktualizovat pacienta.' });
    }
  }
  
  function goBack() {
    router.push('/patients');
  }
  
  onMounted(async () => {
    await fetchConsultants(); // Fetch consultants first
    await fetchPatientData(); // Then fetch patient data
  });
  
  </script>
  
  <style scoped>
  /* Custom styling if needed */
  </style>