<template>
  <div 
    v-if="loading" 
    class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
  >
    <div class="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center">
      <div class="spinner mb-4"></div>
      <p class="text-gray-800 font-medium">Načítání...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean;
}>();
</script>

<style scoped>
.spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(59, 130, 246, 0.1);
  border-top-color: rgba(59, 130, 246, 1);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>