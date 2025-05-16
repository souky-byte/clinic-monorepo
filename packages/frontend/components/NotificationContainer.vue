<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-md">
    <TransitionGroup name="notification">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        :class="[
          'p-4 rounded-lg shadow-lg flex items-start',
          'transform transition-all duration-300',
          getNotificationClass(notification.type)
        ]"
      >
        <div class="flex-1">
          <p class="text-white font-medium">{{ notification.message }}</p>
        </div>
        <button 
          @click="removeNotification(notification.id)"
          class="ml-4 text-white/80 hover:text-white focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore } from '~/stores/notification';

const notificationStore = useNotificationStore();
const notifications = computed(() => notificationStore.notifications);

function getNotificationClass(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-600';
    case 'error':
      return 'bg-red-600';
    case 'warning':
      return 'bg-amber-500';
    case 'info':
      return 'bg-blue-600';
    default:
      return 'bg-gray-700';
  }
}

function removeNotification(id: string) {
  notificationStore.remove(id);
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>