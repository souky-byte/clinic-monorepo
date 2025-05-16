import { defineStore } from 'pinia';

interface LoadingState {
  isLoading: boolean;
  pendingRequests: number;
}

export const useLoadingStore = defineStore('loading', {
  state: (): LoadingState => ({
    isLoading: false,
    pendingRequests: 0,
  }),
  
  actions: {
    startLoading() {
      this.pendingRequests++;
      this.isLoading = true;
    },
    
    finishLoading() {
      this.pendingRequests--;
      if (this.pendingRequests <= 0) {
        this.pendingRequests = 0;
        this.isLoading = false;
      }
    },
    
    resetLoading() {
      this.pendingRequests = 0;
      this.isLoading = false;
    }
  }
});