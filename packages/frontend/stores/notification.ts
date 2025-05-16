import { defineStore } from 'pinia';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
}

export const useNotificationStore = defineStore('notification', {
  state: (): NotificationState => ({
    notifications: [],
  }),
  
  actions: {
    show(notification: Omit<Notification, 'id'>) {
      const id = Math.random().toString(36).substring(2, 9);
      const newNotification: Notification = {
        id,
        ...notification,
        duration: notification.duration || 5000,
      };
      
      this.notifications.push(newNotification);
      
      // Auto-remove notification after duration
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
      
      return id;
    },
    
    remove(id: string) {
      this.notifications = this.notifications.filter(notification => notification.id !== id);
    },
    
    clearAll() {
      this.notifications = [];
    }
  }
});