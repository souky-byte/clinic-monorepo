<template>
  <div class="p-4 md:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Začít novou schůzku</h1>
      <Button label="Zpět na seznam" icon="pi pi-arrow-left" @click="goBackToAppointmentsList" severity="secondary" outlined />
    </div>

    <Card class="shadow-md">
      <template #content>
        <form @submit.prevent="saveAdHocAppointment" class="space-y-6">
          <div class="p-fluid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            
            <div>
              <label for="adhoc-patient" class="block text-sm font-medium text-gray-700 mb-1">Pacient *</label>
              <Dropdown 
                id="adhoc-patient" 
                v-model="adHocAppointmentData.patientId" 
                :options="patientsList" 
                optionLabel="name" 
                optionValue="id" 
                placeholder="Vyberte pacienta" 
                class="w-full" 
                :invalid="submitted && !adHocAppointmentData.patientId"
                :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
              />
              <small v-if="submitted && !adHocAppointmentData.patientId" class="p-error">Pacient je povinný.</small>
            </div>

            <div>
              <label for="adhoc-appointmentType" class="block text-sm font-medium text-gray-700 mb-1">Typ schůzky *</label>
              <Dropdown 
                id="adhoc-appointmentType" 
                v-model="adHocAppointmentData.appointmentTypeId" 
                :options="appointmentTypesList" 
                optionLabel="name" 
                optionValue="id" 
                placeholder="Vyberte typ schůzky" 
                class="w-full" 
                :invalid="submitted && !adHocAppointmentData.appointmentTypeId"
                :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
              />
              <small v-if="submitted && !adHocAppointmentData.appointmentTypeId" class="p-error">Typ schůzky je povinný.</small>
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Datum a čas</label>
              <p class="p-2 bg-gray-100 rounded-md text-gray-700">{{ formatDisplayDateTime(adHocAppointmentData.date) }}</p>
            </div>
             <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Konzultant</label>
                <p class="p-2 bg-gray-100 rounded-md text-gray-700">{{ authStore.user?.name || 'Neznámý konzultant' }}</p>
            </div>


            <div class="md:col-span-2">
              <label for="adhoc-notes" class="block text-sm font-medium text-gray-700 mb-1">Poznámky</label>
              <Textarea id="adhoc-notes" v-model="adHocAppointmentData.notes" rows="4" class="w-full !text-sm" placeholder="Zadejte poznámky ke schůzce" />
            </div>
          
            <!-- Products Section -->
            <div class="md:col-span-2 space-y-3">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-800">Položky schůzky</h3>
                <Button label="Přidat produkt" icon="pi pi-plus" @click="openAddProductDialog" severity="info" size="small" :loading="loadingInventory" />
              </div>
              <DataTable :value="displayItems" responsiveLayout="scroll" class="p-datatable-sm">
                <Column field="name" header="Název"></Column>
                <Column field="quantity" header="Množství" style="width: 100px">
                  <template #body="slotProps">
                    {{ slotProps.data.isService ? '-' : slotProps.data.quantity }}
                  </template>
                </Column>
                <Column header="Cena/ks (bez DPH)" style="width: 150px">
                    <template #body="slotProps">
                        {{ formatPrice(slotProps.data.unitPrice) }}
                    </template>
                </Column>
                <Column header="DPH (%)" style="width: 100px">
                    <template #body="slotProps">
                        {{ slotProps.data.unitVatRate }}%
                    </template>
                </Column>
                <Column header="Subtotal (s DPH)" style="width: 150px">
                    <template #body="slotProps">
                        {{ formatPrice(slotProps.data.subtotal) }}
                    </template>
                </Column>
                <Column style="width: 80px">
                  <template #body="slotProps">
                    <Button 
                      v-if="!slotProps.data.isService" 
                      icon="pi pi-trash" 
                      text 
                      rounded 
                      severity="danger" 
                      @click="removeProductFromSelection(slotProps.index -1)" 
                      v-tooltip.top="'Odebrat produkt'" 
                    /> <!-- slotProps.index -1 because displayItems adds service at index 0 -->
                  </template>
                </Column>
                <template #empty>
                  <p class="text-center text-gray-500 py-3">Žádné produkty zatím nebyly přidány.</p>
                </template>
                 <template #footer>
                    <div class="flex justify-end font-bold pr-2">
                        Celková cena: {{ formatPrice(finalAppointmentPrice) }}
                    </div>
                </template>
              </DataTable>
            </div>
          </div>

          <div class="pt-4 flex justify-end space-x-3">
            <Button label="Zrušit" icon="pi pi-times" severity="secondary" text @click="goBackToAppointmentsList" />
            <Button type="submit" label="Dokončit a uložit schůzku" icon="pi pi-check" :loading="saving" />
          </div>
        </form>
      </template>
    </Card>

    <!-- Add Product Dialog -->
    <Dialog v-model:visible="showAddProductDialog" header="Přidat produkt na schůzku" :modal="true" :style="{width: '500px'}">
      <div v-if="loadingInventory" class="text-center py-4">
        <ProgressSpinner style="width: 30px; height: 30px" />
        <p>Načítání produktů...</p>
      </div>
      <div v-else class="py-4 space-y-4">
        <div>
          <label for="product-select" class="block text-sm font-medium text-gray-700 mb-1">Vyberte produkt *</label>
          <Dropdown 
            id="product-select"
            v-model="productSelectionForm.selectedInventoryItem"
            :options="allInventoryItems"
            optionLabel="name"
            placeholder="Vyberte produkt ze skladu"
            class="w-full"
            :filter="true" 
            :invalid="submittedProductSelection && !productSelectionForm.selectedInventoryItem"
            :pt="{ input: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight' }, trigger: { class: '!w-auto !py-1.5 !px-2 !text-sm !flex !items-center !justify-center' } }" 
          >
            <template #option="slotProps">
              <div>{{ slotProps.option.name }} ({{ formatPrice(slotProps.option.priceWithoutVAT) }}, Skladem: {{slotProps.option.quantity}})</div>
            </template>
          </Dropdown>
          <small v-if="submittedProductSelection && !productSelectionForm.selectedInventoryItem" class="p-error">Produkt je povinný.</small>
        </div>
        <div>
          <label for="product-quantity" class="block text-sm font-medium text-gray-700 mb-1">Množství *</label>
          <InputNumber 
            id="product-quantity"
            v-model="productSelectionForm.quantity"
            integeronly
            :min="1"
            :max="productSelectionForm.selectedInventoryItem ? productSelectionForm.selectedInventoryItem.quantity : undefined"
            placeholder="Zadejte množství"
            class="w-full"
            :invalid="Boolean(submittedProductSelection && (!productSelectionForm.quantity || (productSelectionForm.selectedInventoryItem && productSelectionForm.quantity !== null && productSelectionForm.quantity > productSelectionForm.selectedInventoryItem.quantity)))"
            :pt="{ input: { root: { class: '!py-1.5 !px-2.5 !text-sm !leading-tight w-full' } } }"
          />
          <small v-if="submittedProductSelection && !productSelectionForm.quantity" class="p-error">Množství je povinné.</small>
          <small v-if="submittedProductSelection && productSelectionForm.selectedInventoryItem && productSelectionForm.quantity !== null && productSelectionForm.quantity > productSelectionForm.selectedInventoryItem.quantity" class="p-error">
            Nedostatečné množství na skladě ({{ productSelectionForm.selectedInventoryItem.quantity }} ks).
          </small>
        </div>
      </div>
      <template #footer>
        <Button label="Zrušit" icon="pi pi-times" text @click="closeAddProductDialog" />
        <Button label="Přidat na schůzku" icon="pi pi-plus" @click="handleAddProductToAppointment" :disabled="loadingInventory" />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';
import { useAuthStore } from '~/stores/auth';

// PrimeVue components
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tooltip from 'primevue/tooltip';
import ProgressSpinner from 'primevue/progressspinner';


definePageMeta({
  middleware: 'auth',
});

// Interfaces
interface PatientLite { id: number; name: string; }
interface AppointmentTypeLite { id: number; name: string; price?: number | null; vatRate?: number | null; } // Added price and vatRate
interface InventoryItemLite { 
  id: number; 
  name: string; 
  priceWithoutVAT: number; 
  vatRate: number;
  quantity: number; // Available stock
}
interface SelectedProduct {
  inventoryItemId: number;
  name: string;
  quantity: number;
  unitPrice: number; // Price without VAT
  unitVatRate: number;
  subtotal: number; // Price with VAT for this line item
  isService?: boolean; // To distinguish service from product
}

interface AdHocAppointmentData {
  patientId: number | null;
  appointmentTypeId: number | null;
  consultantId: number | null;
  date: string; // ISO string
  notes: string | null;
  status: 'completed';
  appointmentProducts: { // For API payload
    inventoryItemId: number;
    quantity: number;
    priceAtTimeOfBooking: number; // without VAT
    vatRateAtTimeOfBooking: number;
  }[];
  totalPrice: number | null; // Total with VAT
}

const { $api } = useApiService();
const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const router = useRouter();

const adHocAppointmentData = reactive<AdHocAppointmentData>({
  patientId: null,
  appointmentTypeId: null,
  consultantId: authStore.user?.id || null,
  date: new Date().toISOString(),
  notes: '',
  status: 'completed',
  appointmentProducts: [],
  totalPrice: null,
});

const submitted = ref(false);
const saving = ref(false);
const patientsList = ref<PatientLite[]>([]);
const appointmentTypesList = ref<AppointmentTypeLite[]>([]);
const allInventoryItems = ref<InventoryItemLite[]>([]);
const selectedProductsList = ref<SelectedProduct[]>([]);

// State for inventory loading
const loadingInventory = ref(false);

// Add Product Dialog State
const showAddProductDialog = ref(false);
const productSelectionForm = reactive<{
  selectedInventoryItem: InventoryItemLite | null;
  quantity: number | null;
}>({
  selectedInventoryItem: null,
  quantity: 1,
});
const submittedProductSelection = ref(false);


async function fetchInitialDropdownData() { 
  try {
    const [patientsRes, typesRes] = await Promise.all([
      $api.get<{data: PatientLite[]}>('/patients', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } }),
      $api.get<{data: AppointmentTypeLite[]}>('/appointment-types', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } }),
    ]);

    let rawPatients = [];
    if (patientsRes.data && Array.isArray(patientsRes.data.data)) rawPatients = patientsRes.data.data;
    else if (patientsRes.data && Array.isArray(patientsRes.data)) rawPatients = patientsRes.data as any;
    patientsList.value = rawPatients;

    let rawTypes = [];
    if (typesRes.data && Array.isArray(typesRes.data.data)) rawTypes = typesRes.data.data;
    else if (typesRes.data && Array.isArray(typesRes.data)) rawTypes = typesRes.data as any;
    appointmentTypesList.value = rawTypes.map((type: any) => ({
        ...type,
        price: type.price ? parseFloat(String(type.price)) : 0, // Ensure price is a number
        vatRate: type.vatRate ? parseFloat(String(type.vatRate)) : 0 // Assuming appointment type has a VAT rate, default to 0 if not
    }));

  } catch (error) {
    console.error("Failed to load initial dropdown data:", error);
    notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst počáteční data pro výběry.' });
  }
}

async function fetchInventoryItems() { // Renamed from loadInventoryItemsIfNeeded, removed inventoryLoaded check
  loadingInventory.value = true;
  try {
    const inventoryRes = await $api.get<{data: InventoryItemLite[]}>('/inventory', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } });
    let rawInventory = [];
    if (inventoryRes.data && Array.isArray(inventoryRes.data.data)) rawInventory = inventoryRes.data.data;
    else if (inventoryRes.data && Array.isArray(inventoryRes.data)) rawInventory = inventoryRes.data as any;
    allInventoryItems.value = rawInventory.map((item: any) => ({
        ...item,
        priceWithoutVAT: parseFloat(String(item.priceWithoutVAT)), // Ensure numeric
        vatRate: parseFloat(String(item.vatRate)),                 // Ensure numeric
        quantity: parseInt(String(item.quantity), 10) || 0
    }));
  } catch (error) {
    console.error("Failed to load inventory items:", error);
    notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst skladové položky.' });
  } finally {
    loadingInventory.value = false;
  }
}

const formatDisplayDateTime = (isoString: string) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return isoString; }
};

const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '- Kč';
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return '- Kč';
  return `${numericPrice.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
};

const openAddProductDialog = async () => {
  await fetchInventoryItems(); // Always fetch inventory when opening dialog
  productSelectionForm.selectedInventoryItem = null;
  productSelectionForm.quantity = 1;
  submittedProductSelection.value = false;
  showAddProductDialog.value = true;
};

const closeAddProductDialog = () => {
  showAddProductDialog.value = false;
};

const handleAddProductToAppointment = () => {
  submittedProductSelection.value = true;
  const { selectedInventoryItem, quantity } = productSelectionForm;

  if (!selectedInventoryItem || quantity === null || quantity <= 0) {
    notificationStore.show({ type: 'error', message: 'Vyberte produkt a zadejte platné množství.' });
    return;
  }
  if (quantity > selectedInventoryItem.quantity) {
    notificationStore.show({ type: 'error', message: `Nedostatečné množství na skladě (${selectedInventoryItem.quantity} ks).` });
    return;
  }

  const subtotal = selectedInventoryItem.priceWithoutVAT * quantity * (1 + selectedInventoryItem.vatRate / 100);
  
  selectedProductsList.value.push({
    inventoryItemId: selectedInventoryItem.id,
    name: selectedInventoryItem.name,
    quantity: quantity,
    unitPrice: selectedInventoryItem.priceWithoutVAT,
    unitVatRate: selectedInventoryItem.vatRate,
    subtotal: parseFloat(subtotal.toFixed(2))
  });
  closeAddProductDialog();
};

const removeProductFromSelection = (index: number) => {
  selectedProductsList.value.splice(index, 1);
};

const displayItems = computed(() => {
  const items: SelectedProduct[] = [];
  const selectedType = appointmentTypesList.value.find(type => type.id === adHocAppointmentData.appointmentTypeId);
  
  if (selectedType) {
    const typePrice = selectedType.price || 0;
    const typeVatRate = selectedType.vatRate || 0; // Assuming appointment type has a VAT rate
    const typeSubtotal = typePrice * (1 + typeVatRate / 100);
    items.push({
      inventoryItemId: -1, // Special ID for service
      name: selectedType.name + " (Služba)",
      quantity: 1,
      unitPrice: typePrice,
      unitVatRate: typeVatRate,
      subtotal: parseFloat(typeSubtotal.toFixed(2)),
      isService: true
    });
  }
  return items.concat(selectedProductsList.value);
});

const finalAppointmentPrice = computed(() => {
  return displayItems.value.reduce((total, item) => total + item.subtotal, 0);
});


async function saveAdHocAppointment() {
  submitted.value = true;
  saving.value = true;

  if (!adHocAppointmentData.patientId || !adHocAppointmentData.appointmentTypeId) {
    notificationStore.show({ type: 'error', message: 'Vyplňte prosím pacienta a typ schůzky.' });
    saving.value = false;
    return;
  }
  if (!adHocAppointmentData.consultantId) {
     notificationStore.show({ type: 'error', message: 'Nelze uložit schůzku bez přiřazeného konzultanta. Zkuste se prosím přihlásit znovu.' });
     saving.value = false;
     return;
  }

  const createAppointmentPayload = {
    patientId: adHocAppointmentData.patientId,
    appointmentTypeId: adHocAppointmentData.appointmentTypeId,
    consultantId: adHocAppointmentData.consultantId,
    date: adHocAppointmentData.date,
    notes: adHocAppointmentData.notes,
    status: 'completed',
    products: selectedProductsList.value.map(p => ({
      inventoryItemId: p.inventoryItemId,
      quantity: p.quantity,
    })),
  };

  try {
    // Create the appointment with status included
    await $api.post<{id: number}>('/appointments', createAppointmentPayload); 
    
    notificationStore.show({ type: 'success', message: 'Nová schůzka byla úspěšně vytvořena a dokončena.' });
    router.push('/appointments');
    
  } catch (error: any) {
    console.error('Failed to create ad-hoc appointment:', error);
    const errorMessage = error.response?.data?.message || 'Nepodařilo se vytvořit schůzku.';
    if (Array.isArray(errorMessage)) {
        notificationStore.show({ type: 'error', message: errorMessage.join(', ') });
    } else {
        notificationStore.show({ type: 'error', message: errorMessage });
    }
  } finally {
    saving.value = false;
  }
}

function goBackToAppointmentsList() {
  router.push('/appointments');
}

onMounted(() => {
  if (!authStore.user?.id) {
      notificationStore.show({ type: 'warning', message: 'Pro vytvoření schůzky musíte být přihlášen jako konzultant.'});
  }
  fetchInitialDropdownData(); 
});

</script>

<style scoped>
/* Add any specific styles if needed */
:deep(.p-datatable-footer) {
    text-align: right;
    padding-right: 1rem; /* Adjust as needed */
}
</style> 