<template>
  <div class="card">
    <h1 class="text-2xl font-bold mb-6 text-center">Přihlášení</h1>
    
    <form @submit.prevent="login" class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          E-mail
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          class="input"
          :class="{ 'border-red-500': errors.email }"
          placeholder="jmeno@example.cz"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Heslo
        </label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          required
          class="input"
          :class="{ 'border-red-500': errors.password }"
          placeholder="••••••••"
        />
        <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
      </div>
      
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            v-model="form.rememberMe"
            class="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <label for="remember-me" class="ml-2 block text-sm text-gray-700">
            Zapamatovat si mě
          </label>
        </div>
        
        <a href="#" class="text-sm text-primary-600 hover:text-primary-800">
          Zapomenuté heslo?
        </a>
      </div>
      
      <button 
        type="submit" 
        class="btn btn-primary w-full"
        :disabled="isLoading"
      >
        <template v-if="isLoading">
          <span class="inline-block h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></span>
          Přihlašování...
        </template>
        <template v-else>
          Přihlásit se
        </template>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useLoadingStore } from '~/stores/loading';

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
});

const authStore = useAuthStore();
const loadingStore = useLoadingStore();
const isLoading = computed(() => loadingStore.isLoading);

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
});

const errors = reactive({
  email: '',
  password: '',
});

function validateForm() {
  errors.email = '';
  errors.password = '';
  
  let isValid = true;
  
  if (!form.email) {
    errors.email = 'E-mail je povinný';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Neplatný formát e-mailu';
    isValid = false;
  }
  
  if (!form.password) {
    errors.password = 'Heslo je povinné';
    isValid = false;
  } else if (form.password.length < 6) {
    errors.password = 'Heslo musí mít alespoň 6 znaků';
    isValid = false;
  }
  
  return isValid;
}

async function login() {
  if (!validateForm()) return;
  
  const success = await authStore.login(form.email, form.password);
  
  if (success) {
    navigateTo('/dashboard');
  }
}
</script>