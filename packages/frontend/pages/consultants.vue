<template>
  <div class="p-4 md:p-6 space-y-6">
    <h1 class="text-2xl font-semibold text-gray-900">Správa konzultantů</h1>

    <Card>
      <template #content>
        <DataTable
          :value="consultants"
          :loading="loading"
          lazy
          paginator
          :rows="lazyParams.rows"
          :first="lazyParams.first"
          :total-records="totalRecords"
          @page="onPage($event)"
          @sort="onSort($event)"
          data-key="id"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          :rows-per-page-options="[10, 25, 50, 100]"
          current-page-report-template="Zobrazeno {first} až {last} z celkových {totalRecords} konzultantů"
          responsive-layout="scroll"
          class="p-datatable-customers"
        >
          <template #header>
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <div class="flex flex-col sm:flex-row items-center gap-4 flex-grow">
                <span class="w-full sm:w-auto">
                  <InputText v-model="globalFilterValue" placeholder="Hledat (jméno, email)..." class="w-full sm:min-w-[250px]" @input="onGlobalFilterChangeDebounced" />
                </span>
                <Dropdown 
                  v-model="statusFilterValue"
                  :options="userStatusOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Status"
                  show-clear
                  class="w-full sm:w-auto sm:min-w-[180px]"
                  @change="onStatusFilterChange" 
                />
              </div>
              <Button label="Nový konzultant" icon="pi pi-plus" class="p-button-success w-full sm:w-auto mt-2 sm:mt-0" @click="openNewConsultantDialog" />
            </div>
          </template>

          <template #empty>
            Nenalezeni žádní konzultanti.
          </template>
          <template #loading>
            Načítání dat konzultantů. Prosím počkejte...
          </template>

          <Column field="name" header="Jméno" sortable></Column>
          <Column field="email" header="Email" sortable></Column>

          <Column field="role" header="Role" sortable>
            <template #body="{ data }">
              <Tag :value="data.role" :severity="getRoleSeverity(data.role)" />
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>

          <Column field="lastActive" header="Poslední aktivita" sortable data-type="date">
            <template #body="{ data }">
              {{ formatDate(data.lastActive) }}
            </template>
          </Column>

          <Column field="createdAt" header="Vytvořen" sortable data-type="date">
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column header="Akce" :exportable="false" style="min-width:10rem">
            <template #body="{data}">
              <div class="flex gap-2">
                <Button icon="pi pi-pencil" outlined rounded @click="editConsultant(data)" v-tooltip.top="'Upravit'"/>
                <Button icon="pi pi-key" outlined rounded severity="warn" @click="openResetPasswordDialog(data)" v-tooltip.top="'Resetovat heslo'"/>
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Dialog :header="isEditMode ? 'Upravit konzultanta' : 'Nový konzultant'" v-model:visible="consultantDialogVisible" :modal="true" :style="{width: '450px'}" @hide="submitted = false">
      <div class="formgrid grid pt-3">
        <div class="field col-12 mb-4">
          <label for="name" class="block text-sm font-semibold text-gray-800 mb-1.5">Jméno <span class="text-red-500">*</span></label>
          <InputText id="name" v-model.trim="currentConsultant.name" required autofocus class="w-full p-inputtext-lg" :class="{'p-invalid': submitted && !currentConsultant.name}" />
          <small v-if="submitted && !currentConsultant.name" class="p-error mt-1">Jméno je povinné.</small>
        </div>

        <div class="field col-12 mb-4">
          <label for="email" class="block text-sm font-semibold text-gray-800 mb-1.5">Email <span class="text-red-500">*</span></label>
          <InputText id="email" v-model.trim="currentConsultant.email" required class="w-full p-inputtext-lg" :class="{'p-invalid': submitted && !currentConsultant.email}" />
          <small v-if="submitted && !currentConsultant.email" class="p-error mt-1">Email je povinný.</small>
        </div>

        <div v-if="!isEditMode" class="field col-12 mb-4">
          <label for="password" class="block text-sm font-semibold text-gray-800 mb-1.5">Heslo <span class="text-red-500">*</span></label>
          <Password id="password" v-model="currentConsultant.password" required class="w-full" inputClass="w-full p-inputtext-lg" :inputStyle="{'width': '100%'}" :class="{'p-invalid': submitted && !currentConsultant.password}" toggleMask :feedback="true">
            <template #header><h6 class="text-sm font-semibold mb-1">Síla hesla</h6></template>
            <template #footer>
              <Divider />
              <p class="mt-2">Doporučení</p>
              <ul class="pl-2 ml-2 mt-0" style="line-height: 1.5">
                  <li>Alespoň jedno malé písmeno</li>
                  <li>Alespoň jedno velké písmeno</li>
                  <li>Alespoň jedna číslice</li>
                  <li>Minimálně 8 znaků</li>
              </ul>
            </template>
          </Password>
          <small v-if="submitted && !currentConsultant.password" class="p-error mt-1">Heslo je povinné.</small>
        </div>

        <div class="field col-12 mb-3">
          <label for="role" class="block text-sm font-semibold text-gray-800 mb-1.5">Role <span class="text-red-500">*</span></label>
          <Dropdown id="role" v-model="currentConsultant.role" :options="userRoleOptions" optionLabel="label" optionValue="value" placeholder="Vyberte roli" required class="w-full p-inputtext-lg" panelClass="p-inputtext-lg" :class="{'p-invalid': submitted && !currentConsultant.role}" />
          <small v-if="submitted && !currentConsultant.role" class="p-error mt-1">Role je povinná.</small>
        </div>

        <div v-if="isEditMode" class="field col-12 mb-3">
          <label for="status" class="block text-sm font-semibold text-gray-800 mb-1.5">Status <span class="text-red-500">*</span></label>
          <Dropdown id="status" v-model="currentConsultant.status" :options="userStatusOptions" optionLabel="label" optionValue="value" placeholder="Vyberte status" required class="w-full p-inputtext-lg" panelClass="p-inputtext-lg" :class="{'p-invalid': submitted && !currentConsultant.status}" />
          <small v-if="submitted && isEditMode && !currentConsultant.status" class="p-error mt-1">Status je povinný.</small>
        </div>

      </div>

      <template #footer>
        <Button label="Zrušit" icon="pi pi-times" @click="consultantDialogVisible = false" class="p-button-text" :disabled="saveLoading"/>
        <Button :label="isEditMode ? 'Uložit změny' : 'Vytvořit konzultanta'" icon="pi pi-check" @click="saveConsultant" :loading="saveLoading" autofocus />
      </template>
    </Dialog>

    <!-- Reset Password Dialog -->
    <Dialog header="Resetovat heslo" v-model:visible="resetPasswordDialogVisible" :modal="true" :style="{width: '450px'}" @hide="resetPasswordSubmitted = false">
      <div v-if="resetPasswordConsultantInfo" class="formgrid grid pt-3">
        <div class="field col-12 mb-2">
          <p class="text-sm text-gray-700">
            Resetujete heslo pro konzultanta: 
            <span class="font-semibold">{{ resetPasswordConsultantInfo.name || resetPasswordConsultantInfo.email }}</span>.
          </p>
        </div>
        <div class="field col-12 mb-3">
          <label for="newPassword" class="block text-sm font-semibold text-gray-800 mb-1.5">Nové heslo <span class="text-red-500">*</span></label>
          <Password id="newPassword" v-model="newPassword" required class="w-full" inputClass="w-full p-inputtext-lg" :inputStyle="{'width': '100%'}" :class="{'p-invalid': resetPasswordSubmitted && !newPassword}" toggleMask :feedback="true" autofocus>
            <template #header><h6 class="text-sm font-semibold mb-1">Síla hesla</h6></template>
            <template #footer>
              <Divider />
              <p class="mt-2">Doporučení</p>
              <ul class="pl-2 ml-2 mt-0" style="line-height: 1.5">
                  <li>Alespoň jedno malé písmeno</li>
                  <li>Alespoň jedno velké písmeno</li>
                  <li>Alespoň jedna číslice</li>
                  <li>Minimálně 8 znaků</li>
              </ul>
            </template>
          </Password>
          <small v-if="resetPasswordSubmitted && !newPassword" class="p-error mt-1">Nové heslo je povinné.</small>
        </div>
      </div>
       <template #footer>
        <Button label="Zrušit" icon="pi pi-times" @click="resetPasswordDialogVisible = false" class="p-button-text" :disabled="resetPasswordLoading"/>
        <Button label="Uložit nové heslo" icon="pi pi-check" @click="saveNewPassword" :loading="resetPasswordLoading" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import { useDebounceFn } from '@vueuse/core';
import Password from 'primevue/password';
import Message from 'primevue/message';
import Divider from 'primevue/divider';

import { useApiService } from '~/composables/useApiService';
import { useNotificationStore } from '~/stores/notification';
import type { Consultant, PaginatedConsultantsResult } from '~/types/consultants';
import { UserRole, UserStatus, ConsultantSortBy } from '~/types/consultants';

const { $api } = useApiService();
const notificationStore = useNotificationStore();

const consultants = ref<Consultant[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const defaultRows = 10;

const lazyParams = reactive({
  first: 0,
  rows: defaultRows,
  page: 1,
  sortField: ConsultantSortBy.CREATED_AT,
  sortOrder: -1 as (1 | -1 | undefined | null),
  globalFilter: null as string | null,
  statusFilter: null as UserStatus | null,
});

const globalFilterValue = ref<string | null>(null);
const statusFilterValue = ref<UserStatus | null>(null);

const userStatusOptions = Object.values(UserStatus).map(status => ({ label: status.charAt(0).toUpperCase() + status.slice(1), value: status }));
const userRoleOptions = Object.values(UserRole).map(role => ({ label: role.charAt(0).toUpperCase() + role.slice(1), value: role }));

const loadConsultants = async () => {
  loading.value = true;
  try {
    const apiParams: Record<string, any> = {
      page: lazyParams.page,
      limit: lazyParams.rows,
      sortBy: lazyParams.sortField || ConsultantSortBy.CREATED_AT,
      sortOrder: lazyParams.sortOrder === 1 ? 'asc' : 'desc',
    };

    if (lazyParams.globalFilter && lazyParams.globalFilter.trim() !== '') {
      apiParams.search = lazyParams.globalFilter.trim();
    }
    
    if (statusFilterValue.value) {
      apiParams.status = statusFilterValue.value;
    }

    const response = await $api.get<PaginatedConsultantsResult>('/consultants', { params: apiParams });
    consultants.value = response.data.data;
    totalRecords.value = response.data.total;

  } catch (error: any) {
    console.error('Error fetching consultants:', error);
    notificationStore.show({ type: 'error', message: 'Nepodařilo se načíst konzultanty.', duration: 5000 });
    consultants.value = [];
    totalRecords.value = 0;
  } finally {
    loading.value = false;
  }
};

const onPage = (event: DataTablePageEvent) => {
  lazyParams.first = event.first;
  lazyParams.rows = event.rows;
  lazyParams.page = event.page ? event.page + 1 : 1;
  loadConsultants();
};

const onSort = (event: DataTableSortEvent) => {
  lazyParams.sortField = event.sortField as ConsultantSortBy || ConsultantSortBy.CREATED_AT;
  lazyParams.sortOrder = event.sortOrder as (1 | -1 | undefined | null);
  loadConsultants();
};

const onGlobalFilterChange = () => {
  lazyParams.globalFilter = globalFilterValue.value;
  lazyParams.page = 1;
  lazyParams.first = 0;
  loadConsultants();
}
const onGlobalFilterChangeDebounced = useDebounceFn(onGlobalFilterChange, 500);

const onStatusFilterChange = () => {
  lazyParams.page = 1;
  lazyParams.first = 0;
  loadConsultants(); 
};

const consultantDialogVisible = ref(false);
const currentConsultant = ref<Partial<Consultant & { password?: string }>>({});
const isEditMode = ref(false);
const submitted = ref(false);
const saveLoading = ref(false);

// Refs for Reset Password Dialog
const resetPasswordDialogVisible = ref(false);
const resetPasswordConsultantInfo = ref<{ id: string; name?: string; email?: string } | null>(null);
const newPassword = ref('');
const resetPasswordLoading = ref(false);
const resetPasswordSubmitted = ref(false);

const openNewConsultantDialog = () => {
  currentConsultant.value = {
    name: '',
    email: '',
    password: '',
    role: UserRole.CONSULTANT,
    status: UserStatus.ACTIVE,
  };
  submitted.value = false;
  isEditMode.value = false;
  consultantDialogVisible.value = true;
};

const editConsultant = (consultantData: Consultant) => {
  currentConsultant.value = { 
    ...consultantData, 
    password: '' 
  };
  submitted.value = false;
  isEditMode.value = true;
  consultantDialogVisible.value = true;
};

const openResetPasswordDialog = (consultantData: Consultant) => {
  resetPasswordConsultantInfo.value = { 
    id: String(consultantData.id),
    name: consultantData.name, 
    email: consultantData.email 
  };
  newPassword.value = '';
  resetPasswordSubmitted.value = false;
  resetPasswordDialogVisible.value = true;
};

const saveConsultant = async () => {
  submitted.value = true;
  saveLoading.value = true;

  if (!currentConsultant.value.name?.trim() || 
      !currentConsultant.value.email?.trim() || 
      (!isEditMode.value && !currentConsultant.value.password) ||
      !currentConsultant.value.role ||
      (isEditMode.value && !currentConsultant.value.status)
    ) {
    notificationStore.show({ type: 'error', message: 'Vyplňte prosím všechna povinná pole.', duration: 3000 });
    saveLoading.value = false;
    return;
  }

  try {
    if (isEditMode.value) {
      if (!currentConsultant.value.id) {
        notificationStore.show({ type: 'error', message: 'Chybí ID konzultanta pro úpravu.', duration: 3000 });
        saveLoading.value = false;
        return;
      }
      const editData = {
        name: currentConsultant.value.name,
        email: currentConsultant.value.email,
        role: currentConsultant.value.role,
        status: currentConsultant.value.status,
      };
      await $api.put(`/consultants/${currentConsultant.value.id}`, editData);
      notificationStore.show({ type: 'success', message: 'Konzultant úspěšně aktualizován.', duration: 3000 });
      consultantDialogVisible.value = false;
      loadConsultants();
    } else {
      const newConsultantData = {
        name: currentConsultant.value.name,
        email: currentConsultant.value.email,
        password: currentConsultant.value.password,
        role: currentConsultant.value.role,
      };
      await $api.post('/consultants', newConsultantData);
      notificationStore.show({ type: 'success', message: 'Konzultant úspěšně vytvořen.', duration: 3000 });
      consultantDialogVisible.value = false;
      loadConsultants();
    }
  } catch (error: any) {
    console.error('Error saving consultant:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Nepodařilo se uložit konzultanta.';
    notificationStore.show({ type: 'error', message: errorMessage, duration: 5000 });
  } finally {
    saveLoading.value = false;
  }
};

const saveNewPassword = async () => {
  resetPasswordSubmitted.value = true;
  if (!newPassword.value) {
    notificationStore.show({ type: 'error', message: 'Nové heslo nemůže být prázdné.', duration: 3000 });
    return;
  }
  if (!resetPasswordConsultantInfo.value?.id) {
    notificationStore.show({ type: 'error', message: 'Chybí ID konzultanta pro reset hesla.', duration: 3000 });
    return;
  }

  resetPasswordLoading.value = true;
  try {
    await $api.post(`/consultants/${resetPasswordConsultantInfo.value.id}/reset-password`, { password: newPassword.value });
    notificationStore.show({ type: 'success', message: `Heslo pro ${resetPasswordConsultantInfo.value.name || resetPasswordConsultantInfo.value.email} bylo úspěšně resetováno.`, duration: 4000 });
    resetPasswordDialogVisible.value = false;
  } catch (error: any) {
    console.error('Error resetting password:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Nepodařilo se resetovat heslo.';
    notificationStore.show({ type: 'error', message: errorMessage, duration: 5000 });
  } finally {
    resetPasswordLoading.value = false;
  }
};

const formatDate = (value: string | Date | undefined | null): string => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch (e) {
    return String(value);
  }
};

const getRoleSeverity = (role: UserRole) => {
  if (role === UserRole.ADMIN) return 'danger';
  if (role === UserRole.CONSULTANT) return 'info';
  return 'secondary';
};

const getStatusSeverity = (status: UserStatus) => {
  if (status === UserStatus.ACTIVE) return 'success';
  if (status === UserStatus.INACTIVE) return 'warning';
  return 'secondary';
};

onMounted(() => {
  loadConsultants();
});

</script>

<style scoped>
/* Custom styles for the page */
.p-datatable-customers .p-datatable-thead > tr > th {
  background-color: #f8f9fa;
  color: #333;
  font-weight: bold;
}

/* Add more specific styles as needed */
</style> 