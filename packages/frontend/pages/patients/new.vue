<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Přidat nového pacienta</h1>
      <NuxtLink to="/patients" class="btn btn-secondary">Zpět na seznam</NuxtLink>
    </div>

    <div class="card">
      <form @submit.prevent="addPatient" class="space-y-4 md:space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Jméno a příjmení *</label>
          <input id="name" v-model="newPatientData.name" type="text" required class="input" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" v-model="newPatientData.email" type="email" class="input" />
          </div>
          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input id="phone" v-model="newPatientData.phone" type="tel" class="input" />
          </div>
        </div>
        
        <div>
          <label for="address" class="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
          <textarea id="address" v-model="newPatientData.address" rows="3" class="input"></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
            <label for="dateOfBirth" class="block text-sm font-medium text-gray-700 mb-1">Datum narození</label>
            <input id="dateOfBirth" v-model="newPatientData.dateOfBirth" type="date" class="input" />
          </div>
          <div>
            <label for="consultantId" class="block text-sm font-medium text-gray-700 mb-1">Přiřazený konzultant *</label>
            <SelectRoot v-model="newPatientData.consultantId">
              <SelectTrigger class="input flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <SelectValue placeholder="Vyberte konzultanta..." />
                <SelectIcon asChild>
                  <ChevronDownIcon class="h-4 w-4 opacity-50" />
                </SelectIcon>
              </SelectTrigger>
              <SelectPortal>
                <SelectContent class="relative z-[60] min-w-[--radix-select-trigger-width] overflow-hidden rounded-md border bg-white text-gray-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2" position="popper" :side-offset="5">
                  <SelectViewport class="max-h-60 p-1">
                    <SelectItem v-for="consultant in consultantsList" :key="consultant.id" :value="consultant.id.toString()">
                      <SelectItemText>{{ consultant.name }}</SelectItemText>
                      <SelectItemIndicator class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                         <CheckIcon class="h-4 w-4" />
                      </SelectItemIndicator>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>
        </div>

        <div>
          <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
          <textarea id="notes" v-model="newPatientData.notes" rows="4" class="input"></textarea>
        </div>

        <div class="pt-2 flex justify-end space-x-3">
          <NuxtLink to="/patients" class="btn btn-secondary">Zrušit</NuxtLink>
          <button type="submit" class="btn btn-primary">Uložit pacienta</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from 'reka-ui';
import { CheckIcon, ChevronDownIcon } from '@radix-icons/vue';

definePageMeta({
  middleware: 'auth',
});

interface CreatePatientDto {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null; // Expected format YYYY-MM-DD
  consultantId: number | null; // Required
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
  dateOfBirth: null,
  consultantId: null,
  notes: null,
});

const consultantsList = ref<Consultant[]>([]);

async function fetchConsultants() {
  try {
    console.log('[fetchConsultants] Attempting to fetch consultants...');
    const response = await $api.get('/consultants', { params: { limit: 100 } });
    console.log('[fetchConsultants] Raw response.data:', JSON.parse(JSON.stringify(response.data)));
    
    let rawConsultantsArray = [];
    if (response.data && Array.isArray(response.data.data)) {
        rawConsultantsArray = response.data.data;
    } else if (response.data && Array.isArray(response.data)) { 
        rawConsultantsArray = response.data;
    }

    consultantsList.value = rawConsultantsArray.map((c: any) => ({ id: c.id, name: c.name }));
    console.log('[fetchConsultants] Processed consultantsList.value:', JSON.parse(JSON.stringify(consultantsList.value)));

  } catch (error: any) {
    console.error('[fetchConsultants] Failed to load consultants:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst konzultanty.' });
  }
}

async function addPatient() {
  if (!newPatientData.name || newPatientData.consultantId === null) {
    notificationStore.show({ type: 'error', message: 'Jméno pacienta a přiřazený konzultant jsou povinná pole.' });
    return;
  }

  // Ensure dateOfBirth is in YYYY-MM-DD format if provided, or null
  let payloadConsultantId = newPatientData.consultantId !== null ? Number(newPatientData.consultantId) : null;
  if (payloadConsultantId === null) {
     notificationStore.show({ type: 'error', message: 'Prosím vyberte konzultanta.' });
     return;
  }

  const payload = {
    ...newPatientData,
    consultantId: payloadConsultantId,
    dateOfBirth: newPatientData.dateOfBirth ? newPatientData.dateOfBirth : null, // Ensure it sends null if empty
  };

  try {
    const response = await $api.post('/patients', payload);
    notificationStore.show({ type: 'success', message: `Pacient ${response.data.name} byl úspěšně vytvořen.` });
    router.push('/patients'); // Or to `/patients/${response.data.id}` if you want to go to detail
  } catch (error: any) {
    console.error('Failed to add patient:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se přidat pacienta.' });
  }
}

onMounted(() => {
  fetchConsultants();
});

</script>

<style scoped>
/* Add any specific styles if needed */
</style>