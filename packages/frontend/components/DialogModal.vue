<template>
  <div class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
    <div 
      class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
      @click.stop
    >
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="px-6 py-4 overflow-y-auto">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

defineProps<{
  title: string;
}>();

const emit = defineEmits(['close']);

// Close modal when clicking outside or pressing escape
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      emit('close');
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape);
  });
});
</script>