<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-semibold text-gray-900">Skladové položky</h1>
      
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
                    <InputNumber id="quantity" v-model="product.quantity" integeronly :min="0" required :invalid="submitted && product.quantity == null" fluid />
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

    <Card>
      <template #content>
        <DataTable 
          :value="items" 
          :loading="loading" 
          lazy 
          paginator 
          :rows="serverOptions.rows" 
          :first="firstPageRecord" 
          :total-records="serverItemsLength" 
          @page="onPage" 
          @sort="onSort" 
          data-key="id"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          :rows-per-page-options="[10, 25, 50, 100]"
          current-page-report-template="Zobrazeno {first} až {last} z celkových {totalRecords} položek"
          responsive-layout="scroll" 
          class="p-datatable-sm" 
          stripedRows
          :showGridlines="false"
          size="small"
          tableStyle="min-width: 50rem"
          sort-mode="single"
        >
          <template #empty>Nebyly nalezeny žádné skladové položky.</template>
          <template #loading>Načítání skladových položek...</template>

          <Column field="name" header="Název" sortable style="min-width: 12rem;"></Column>
          <Column field="description" header="Popis" style="min-width: 15rem;">
            <template #body="{data}">
              <span class="truncate block" style="max-width: 20ch;" :title="data.description">{{ data.description || '-' }}</span>
            </template>
          </Column>
          <Column field="quantity" header="Množství" sortable style="min-width: 8rem; text-align: right;"></Column>
          <Column field="priceWithoutVAT" header="Cena bez DPH" sortable style="min-width: 10rem; text-align: right;">
            <template #body="{data}">{{ formatPrice(data.priceWithoutVAT) }}</template>
          </Column>
          <!-- <Column field="vatRate" header="Sazba DPH" sortable style="min-width: 8rem; text-align: center;">
            <template #body="{data}">{{ data.vatRate ? parseFloat(String(data.vatRate)).toFixed(0) + ' %' : '-' }}</template>
          </Column> -->
          <Column field="priceWithVAT" header="Cena s DPH" sortable style="min-width: 10rem; text-align: right;">
            <template #body="{data}">{{ formatPrice(data.priceWithVAT) }}</template>
          </Column>
          <!-- <Column field="createdAt" header="Vytvořeno" sortable style="min-width: 10rem;">
            <template #body="{data}">{{ formatDate(data.createdAt) }}</template>
          </Column>
          <Column field="updatedAt" header="Aktualizováno" sortable style="min-width: 10rem;">
            <template #body="{data}">{{ formatDate(data.updatedAt) }}</template>
          </Column> -->
          <Column header="Akce" style="min-width: 8rem;" frozen alignFrozen="right">
            <template #body="{data}">
              <div class="flex gap-2 justify-center">
                <Button icon="pi pi-plus-circle" outlined rounded severity="success" @click="openRestockModal(data)" v-tooltip.top="'Naskladnit'" />
                <Button v-if="isAdmin" icon="pi pi-trash" outlined rounded severity="danger" @click="openDeleteModal(data)" v-tooltip.top="'Smazat'" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    
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
import { useAuthStore } from '~/stores/auth';
import { useNotificationStore } from '~/stores/notification';
import { useApiService } from '~/composables/useApiService';

// PrimeVue components (ensure these are auto-imported or add explicit imports if needed)
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import MultiSelect from 'primevue/multiselect';
import Tooltip from 'primevue/tooltip';
import Card from 'primevue/card';


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
  vatRate: 21, // Default VAT rate as a number
  priceWithVAT: null, 
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
            visibleToAll: currentProduct.isVisible, 
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
// const headers: Header[] = [
//   { text: "Název", value: "name", sortable: true },
//   { text: "Popis", value: "description" },
//   { text: "Množství", value: "quantity", sortable: true },
//   { text: "Cena bez DPH", value: "priceWithoutVAT", sortable: true },
//   { text: "Sazba DPH", value: "vatRate", sortable: true },
//   { text: "Cena s DPH", value: "priceWithVAT", sortable: true },
//   { text: "Akce", value: "actions", width: 120 },
// ];

const items = ref<InventoryItem[]>([]);
const loading = ref(true);
const serverItemsLength = ref(0);

// ServerOptions for PrimeVue DataTable
// Note: PrimeVue page is 0-indexed, rowsPerPage is just rows
// sortBy is sortField, sortType is sortOrder (1 for asc, -1 for desc)
const serverOptions = ref({
  page: 0, // PrimeVue page is 0-indexed
  rows: 10, // Corresponds to rowsPerPage
  sortField: 'createdAt',
  sortOrder: -1, // -1 for desc, 1 for asc
});

const firstPageRecord = computed(() => serverOptions.value.page * serverOptions.value.rows);

// Event handlers for DataTable
const onPage = (event: DataTablePageEvent) => {
  serverOptions.value.page = event.page || 0;
  serverOptions.value.rows = event.rows || 10;
  loadFromServer();
};

const onSort = (event: DataTableSortEvent) => {
  serverOptions.value.sortField = String(event.sortField || 'createdAt');
  serverOptions.value.sortOrder = event.sortOrder || -1;
  loadFromServer();
};

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
    const params: Record<string, any> = {
      page: serverOptions.value.page + 1, // API is 1-indexed for page
      limit: serverOptions.value.rows,
      sortBy: serverOptions.value.sortField,
      sortOrder: serverOptions.value.sortOrder === 1 ? 'asc' : 'desc',
    };

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
/* Vue3EasyDataTable styles removed */
/* Add any custom styles or overrides for PrimeVue components here if needed */
/* For example, to ensure DataTable fits well */
:deep(.p-datatable) {
  border-radius: var(--p-border-radius, 6px); /* Use PrimeVue variable or your own */
}

:deep(.p-paginator) {
  border-bottom-left-radius: var(--p-border-radius, 6px);
  border-bottom-right-radius: var(--p-border-radius, 6px);
}
</style>