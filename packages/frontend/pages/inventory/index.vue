<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1>Skladové položky</h1>
      
      <Button label="Přidat položku" icon="pi pi-plus" @click="openNewProductDialog" />

    </div>
    
    <Dialog v-model:visible="productDialogVisible" :style="{ width: '600px' }" header="Detaily produktu" :modal="true" class="p-fluid">
        <div class="flex flex-col gap-6 py-4">
            <div>
                <label for="name" class="block font-bold mb-2">Název položky</label>
                <InputText id="name" v-model.trim="product.name" required="true" autofocus :invalid="submitted && !product.name" fluid />
                <small v-if="submitted && !product.name" class="p-error">Název je povinný.</small>
            </div>
            <div>
                <label for="description" class="block font-bold mb-2">Popis</label>
                <Textarea id="description" v-model="product.description" rows="3" cols="20" fluid />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="quantity" class="block font-bold mb-2">Množství</label>
                    <InputNumber id="quantity" v-model="product.quantity" integeronly min="0" required :invalid="submitted && product.quantity == null" fluid />
                    <small v-if="submitted && product.quantity == null" class="p-error">Množství je povinné.</small>
                </div>
                <div>
                    <label for="priceWithoutVAT" class="block font-bold mb-2">Cena bez DPH</label>
                    <InputNumber id="priceWithoutVAT" v-model="product.priceWithoutVAT" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" required :invalid="submitted && product.priceWithoutVAT == null" @input="calculatePriceWithVAT" fluid />
                     <small v-if="submitted && product.priceWithoutVAT == null" class="p-error">Cena bez DPH je povinná.</small>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="vatRate" class="block font-bold mb-2">Sazba DPH (%)</label>
                    <SelectButton id="vatRate" v-model="product.vatRate" :options="vatRates" optionLabel="label" optionValue="value" @change="calculatePriceWithVAT" :invalid="submitted && product.vatRate == null" />
                    <small v-if="submitted && product.vatRate == null" class="p-error">Sazba DPH je povinná.</small>
                </div>
                <div>
                    <label for="priceWithVAT" class="block font-bold mb-2">Cena s DPH</label>
                    <InputNumber id="priceWithVAT" v-model="product.priceWithVAT" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" readonly fluid class="bg-gray-100"/>
                </div>
            </div>

            <div class="field-checkbox mt-2">
                <Checkbox v-model="product.isVisible" inputId="isVisibleCheckbox" :binary="true" />
                <label for="isVisibleCheckbox" class="ml-2">Viditelné všem</label>
            </div>

            <div v-if="!product.isVisible && consultantsList.length > 0" class="mt-2">
                <label for="visibleToConsultants" class="block font-bold mb-2">Viditelné pro specifické konzultanty</label>
                <MultiSelect 
                    v-model="product.visibleToConsultantIds" 
                    :options="consultantsList" 
                    optionLabel="name" 
                    optionValue="id" 
                    placeholder="Vyberte konzultanty" 
                    display="chip" 
                    fluid 
                />
            </div>
        </div>

        <template #footer>
            <Button label="Zrušit" icon="pi pi-times" text @click="hideProductDialog" />
            <Button label="Uložit" icon="pi pi-check" @click="saveNewProduct" />
        </template>
    </Dialog>

    <div class="card">
      <Vue3EasyDataTable
        :headers="headers"
        :items="items"
        :loading="loading"
        :server-items-length="serverItemsLength"
        v-model:server-options="serverOptions"
        table-class-name="table"
        theme-color="#1f2937" 
        buttons-pagination
      >
        <template #item-priceWithoutVAT="item">
          {{ formatPrice(item.priceWithoutVAT) }}
        </template>
        <template #item-vatRate="item">
          {{ item.vatRate ? parseFloat(item.vatRate).toFixed(0) + ' %' : '-' }}
        </template>
        <template #item-priceWithVAT="item">
          {{ formatPrice(item.priceWithVAT) }}
        </template>
        <template #item-createdAt="item">
          {{ formatDate(item.createdAt) }}
        </template>
        <template #item-updatedAt="item">
          {{ formatDate(item.updatedAt) }}
        </template>

        <template #item-actions="item">
          <div class="flex space-x-2">
            <button 
              @click="openRestockModal(item)" 
              class="text-blue-600 hover:text-blue-800 p-1"
              title="Naskladnit"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
            </button>
            <button 
              v-if="isAdmin"
              @click="openDeleteModal(item)"
              class="text-red-600 hover:text-red-800 p-1"
              title="Smazat"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <!-- TODO: Add edit button/modal later -->
          </div>
        </template>
      </Vue3EasyDataTable>
    </div>
    
    <!-- Restock Item Modal -->
    <dialog-modal
      v-if="showRestockModal"
      :title="`Naskladnit položku: ${selectedItem?.name}`"
      @close="showRestockModal = false"
    >
      <form @submit.prevent="restockItem">
        <div class="space-y-4">
          <div>
            <label for="restockQuantity" class="block text-sm font-medium text-gray-700 mb-1">Množství k naskladnění</label>
            <input id="restockQuantity" v-model.number="restockQuantity" type="number" min="1" required class="input" />
          </div>
          <div>
            <label for="restockNotes" class="block text-sm font-medium text-gray-700 mb-1">Poznámky (nepovinné)</label>
            <textarea id="restockNotes" v-model="restockNotes" rows="3" class="input"></textarea>
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-3">
          <button type="button" class="btn btn-secondary" @click="showRestockModal = false">Zrušit</button>
          <button type="submit" class="btn btn-primary">Naskladnit</button>
        </div>
      </form>
    </dialog-modal>

    <!-- Delete Item Modal -->
    <dialog-modal
      v-if="showDeleteModal"
      :title="`Opravdu smazat položku: ${selectedItem?.name}?`"
      danger
      @close="showDeleteModal = false"
    >
      <p class="text-sm text-gray-500">
        Tato akce je nevratná. Všechna data spojená s touto položkou budou trvale odstraněna.
      </p>
      <div class="mt-6 flex justify-end space-x-3">
        <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">Zrušit</button>
        <button type="button" @click="deleteItem" class="btn btn-danger">Smazat</button>
      </div>
    </dialog-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue';
import type { Header, Item, ServerOptions, SortType } from 'vue3-easy-data-table';
// @ts-ignore
import Vue3EasyDataTable from 'vue3-easy-data-table';
import 'vue3-easy-data-table/dist/style.css';
import { useAuthStore } from '~/stores/auth';
import { useNotificationStore } from '~/stores/notification';
import { useApiService } from '~/composables/useApiService';
// Removed Radix-Vue Dialog imports

// PrimeVue components (ensure these are auto-imported or add explicit imports if needed)
// import Dialog from 'primevue/dialog';
// import Button from 'primevue/button';
// import InputText from 'primevue/inputtext';
// import Textarea from 'primevue/textarea';
// import InputNumber from 'primevue/inputnumber';
// import SelectButton from 'primevue/selectbutton';
// import Checkbox from 'primevue/checkbox';
// import MultiSelect from 'primevue/multiselect';


const { $api } = useApiService();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const notificationStore = useNotificationStore();

interface InventoryItem {
  id: number;
  name: string;
  description?: string | null;
  quantity: number | null;
  priceWithoutVAT: number | string | null; 
  vatRate: number | string | null;         
  priceWithVAT?: number | string | null;   
  isVisible: boolean;
  visibleToConsultantIds?: number[] | null;
  createdAt: string;
  updatedAt: string;
  visibleToConsultants?: { id: number; name: string }[]; 
}

// Define a specific interface for the product form data
interface ProductFormData {
  name: string;
  description: string | null;
  quantity: number | null;
  priceWithoutVAT: number | null;
  vatRate: number | null;
  priceWithVAT: number | null; // Readonly, calculated
  isVisible: boolean;
  visibleToConsultantIds: number[];
}

interface Consultant {
  id: number;
  name: string;
}

// State for the new product dialog
const productDialogVisible = ref(false);
// Initialize product with a default structure matching ProductFormData
const product = ref<ProductFormData>({
  name: '',
  description: null,
  quantity: null,
  priceWithoutVAT: null,
  vatRate: 21, // Default VAT rate
  priceWithVAT: null, // Will be calculated
  isVisible: true,
  visibleToConsultantIds: []
});
const submitted = ref(false);

const vatRates = ref([
    { label: '21%', value: 21 },
    { label: '15%', value: 15 },
    { label: '10%', value: 10 },
    { label: '0%', value: 0 }
]);

const consultantsList = ref<Consultant[]>([]);

async function fetchConsultants() {
  try {
    const response = await $api.get<{ data: Consultant[] }>('/consultants', { params: { limit: 100, sortBy: 'name', sortOrder: 'ASC' } });
    let rawConsultants = [];
    if (response.data && Array.isArray(response.data.data)) rawConsultants = response.data.data;
    else if (response.data && Array.isArray(response.data)) rawConsultants = response.data as any; // Fallback
    consultantsList.value = rawConsultants;
  } catch (error) {
    console.error("Failed to load consultants for inventory item:", error);
    // notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst seznam konzultantů.' });
  }
}

const openNewProductDialog = () => {
    product.value = { // Reset to initial state matching ProductFormData
        name: '',
        description: null, // Changed from '' to null for consistency
        quantity: null, 
        priceWithoutVAT: null, 
        vatRate: 21, 
        priceWithVAT: null, 
        isVisible: true,
        visibleToConsultantIds: []
    };
    // calculatePriceWithVAT(); // Recalculate if needed after defaults are set
    submitted.value = false;
    productDialogVisible.value = true;
};

const hideProductDialog = () => {
    productDialogVisible.value = false;
    submitted.value = false;
};

const calculatePriceWithVAT = () => {
  const priceVal = product.value.priceWithoutVAT;
  const rateVal = product.value.vatRate;

  if (priceVal != null && rateVal != null) {
    const price = parseFloat(String(priceVal)); // Ensure numeric conversion
    const rate = parseFloat(String(rateVal));   // Ensure numeric conversion
    if (!isNaN(price) && !isNaN(rate)) {
      product.value.priceWithVAT = parseFloat((price * (1 + rate / 100)).toFixed(2));
    } else {
      product.value.priceWithVAT = null;
    }
  } else {
    product.value.priceWithVAT = null;
  }
};

watch(() => product.value.priceWithoutVAT, calculatePriceWithVAT);
watch(() => product.value.vatRate, calculatePriceWithVAT);


const saveNewProduct = async () => {
    submitted.value = true;
    if (!product.value.name?.trim() || product.value.quantity === null || product.value.priceWithoutVAT === null || product.value.vatRate === null) {
        notificationStore.show({ type: 'error', message: 'Prosím, vyplňte všechna povinná pole.' });
        return;
    }

    try {
        const currentProduct = product.value;
        const payload: any = {
            name: currentProduct.name,
            description: currentProduct.description,
            quantity: Number(currentProduct.quantity), 
            priceWithoutVAT: Number(currentProduct.priceWithoutVAT),
            vatRate: Number(currentProduct.vatRate),
            // Map product.isVisible (from form) to visibleToAll (DTO field)
            visibleToAll: currentProduct.isVisible, 
            // priceWithVAT should NOT be sent as per server error
        };

        // Conditionally add visibleToSpecificConsultantIds based on visibleToAll
        if (!payload.visibleToAll) {
            payload.visibleToSpecificConsultantIds = currentProduct.visibleToConsultantIds;
        } else {
            // If visibleToAll is true, ensure visibleToSpecificConsultantIds is not sent,
            // or set to an empty array/null if API expects that for this case.
            // Given the error "should not exist", not sending it is safer.
            // If API requires it as empty array: payload.visibleToSpecificConsultantIds = [];
        }

        const response = await $api.post<InventoryItem>('/inventory', payload);
        items.value.push(response.data); // Assuming API returns the created item
        serverItemsLength.value++; //
        hideProductDialog();
        notificationStore.show({ type: 'success', message: 'Produkt úspěšně vytvořen.' });
        loadFromServer(); // Reload data to see new item and correct pagination
    } catch (error: any) {
        console.error('Failed to save product:', error);
        notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se uložit produkt.' });
    }
};


// Table headers (stávající)
const headers: Header[] = [
  { text: "Název", value: "name", sortable: true },
  { text: "Popis", value: "description" },
  { text: "Množství", value: "quantity", sortable: true },
  { text: "Cena bez DPH", value: "priceWithoutVAT", sortable: true },
  { text: "Sazba DPH", value: "vatRate", sortable: true },
  { text: "Cena s DPH", value: "priceWithVAT", sortable: true },
  { text: "Akce", value: "actions", width: 120 },
];

const items = ref<InventoryItem[]>([]);
const loading = ref(true);
const serverItemsLength = ref(0);
const serverOptions = ref<ServerOptions>({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'createdAt',
  sortType: 'desc',
});

// Original functions for modals - ensure they are present
const selectedItem = ref<InventoryItem | null>(null); // Was potentially removed or commented out
const restockQuantity = ref(1);
const restockNotes = ref('');
const showRestockModal = ref(false);
const showDeleteModal = ref(false);

function openRestockModal(item: InventoryItem) {
  selectedItem.value = JSON.parse(JSON.stringify(item)); // Deep copy
  restockQuantity.value = 1;
  restockNotes.value = '';
  showRestockModal.value = true;
}

async function restockItem() {
  if (!selectedItem.value) return;
  try {
    await $api.post(`/inventory/${selectedItem.value.id}/restock`, { 
      quantity: restockQuantity.value, 
      notes: restockNotes.value 
    });
    notificationStore.show({ type: 'success', message: `Naskladněno ${restockQuantity.value} ks položky ${selectedItem.value.name}` });
    showRestockModal.value = false;
    selectedItem.value = null;
    loadFromServer();
  } catch (error: any) {
    console.error('Failed to restock item:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se naskladnit položku.' });
  }
}

function openDeleteModal(item: InventoryItem) {
  selectedItem.value = JSON.parse(JSON.stringify(item)); // Deep copy
  showDeleteModal.value = true;
}

async function deleteItem() {
  if (!selectedItem.value) return;
  try {
    await $api.delete(`/inventory/${selectedItem.value.id}`);
    notificationStore.show({ type: 'success', message: `Položka ${selectedItem.value.name} byla smazána` });
    showDeleteModal.value = false;
    selectedItem.value = null;
    loadFromServer();
  } catch (error: any) {
    console.error('Failed to delete item:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se smazat položku.' });
  }
}

// Fetch consultants on mount
onMounted(() => {
  fetchConsultants();
  loadFromServer(); // load inventory items
});

// Stávající watcher pro serverOptions
watch(serverOptions, loadFromServer, { deep: true });

// ... (zbytek stávajícího skriptu)
// Funkce, které se již nepoužívají (showAddItemModal, newItem, addItem, selectedConsultantObjects) by měly být odstraněny nebo zakomentovány.
// Pro přehlednost je zde prozatím ponechávám, ale při finálním čištění by se měly odstranit.
const showAddItemModal = ref(false);
const newItem = reactive({ /* ... */ });
const selectedConsultantObjects = ref<Consultant[]>([]);
const addItem = () => {};


// Stávající fetchFilterData pro Vue3EasyDataTable, pokud existuje
// async function fetchFilterData() { ... }

async function loadFromServer() {
  loading.value = true;
  try {
    const params = {
      page: serverOptions.value.page,
      limit: serverOptions.value.rowsPerPage,
      sortBy: serverOptions.value.sortBy,
      sortOrder: serverOptions.value.sortType,
      // Add other filters if you have them (e.g., searchQuery.value)
    };
    // if (searchQuery.value) params.search = searchQuery.value;

    const response = await $api.get<{ data: InventoryItem[]; meta: { total: number } }>('/inventory', { params });
    items.value = response.data.data.map(item => ({
      ...item,
      priceWithoutVAT: parseFloat(String(item.priceWithoutVAT)),
      vatRate: parseFloat(String(item.vatRate)),
      // priceWithVAT is often calculated or comes from API
    }));
    serverItemsLength.value = response.data.meta.total;
  } catch (error: any) {
    console.error('Failed to load inventory items:', error);
    notificationStore.show({ type: 'error', message: error.response?.data?.message || 'Nepodařilo se načíst skladové položky.' });
  } finally {
    loading.value = false;
  }
}

// ... (zbytek stávajících funkcí jako formatPrice, formatDate, modály pro naskladnění/smazání)

// Stávající definice formatPrice a formatDate, pokud byly globální nebo v setupu
// Pokud ne, je třeba je sem přidat nebo zajistit jejich dostupnost
function formatPrice(price: string | number | undefined | null): string {
  if (price === undefined || price === null) return '- Kč';
  let numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return '- Kč';
  return `${numericPrice.toFixed(2)} Kč`;
}

function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
    });
  } catch (e) {
    return String(dateString); // Ensure it's a string if date parsing fails
  }
}

</script>

<style scoped>
.table :deep(th .easy-data-table__header-text) {
  font-weight: 600 !important;
  color: rgb(55 65 81) !important;
  text-align: left;
}

.table :deep(thead th) {
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.table :deep(tbody td) {
  padding: 12px 10px !important;
  border-bottom: 1px solid #f3f4f6;
}

.table :deep(tbody tr:nth-child(even)) {
  background-color: #f9fafb;
}

.table :deep(tbody tr:hover) {
  background-color: #f0f9ff;
}

</style>