import { defineStore } from 'pinia';
import { useNotificationStore } from './notification';
import { useApiService } from '~/composables/useApiService';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'consultant';
  status?: 'active' | 'inactive';
  lastActive?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isRefreshingToken: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isRefreshingToken: false,
  }),
  
  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    isConsultant: (state) => state.user?.role === 'consultant',
  },
  
  actions: {
    async login(email: string, password: string) {
      const notificationStore = useNotificationStore();
      const { $api } = useApiService();
      
      try {
        const response = await $api.post('/auth/login', { email, password });
        this.setAuth(response.data.accessToken, response.data.refreshToken, response.data.user);
        notificationStore.show({
          type: 'success',
          message: 'Přihlášení úspěšné',
        });
        return true;
      } catch (error: any) {
        notificationStore.show({
          type: 'error',
          message: error.response?.data?.message || 'Přihlášení se nezdařilo',
        });
        return false;
      }
    },
    
    setAuth(token: string, refreshToken: string, user: User) {
      console.log('[AuthStore setAuth] Setting auth. Token received:', !!token, 'Refresh token received:', !!refreshToken, 'User received:', !!user);
      this.token = token;
      this.refreshToken = refreshToken;
      this.user = user;
      this.isAuthenticated = true;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_refresh_token', refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(user));
      console.log('[AuthStore setAuth] Auth state set. isAuthenticated:', this.isAuthenticated);
    },
    
    tryAutoLogin() {
      console.log('[AuthStore tryAutoLogin] Attempting auto login...');
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('auth_refresh_token');
      const userString = localStorage.getItem('auth_user');
      
      console.log('[AuthStore tryAutoLogin] Tokens from localStorage - auth_token:', !!token, 'auth_refresh_token:', !!refreshToken, 'auth_user:', !!userString);

      if (token && refreshToken && userString) {
        this.token = token;
        this.refreshToken = refreshToken;
        try {
          this.user = JSON.parse(userString);
          this.isAuthenticated = true;
          console.log('[AuthStore tryAutoLogin] Auto login successful. User:', this.user, 'isAuthenticated:', this.isAuthenticated);
        } catch (e) {
          console.error("[AuthStore tryAutoLogin] Failed to parse user from localStorage. Logging out.", e);
          this.logout(); // Zavolá logout, který má vlastní logování
        }
      } else {
        console.log('[AuthStore tryAutoLogin] No sufficient auth data in localStorage. Skipping auto login.');
        // Pokud zde nic není, isAuthenticated zůstane false, což je správně
      }
    },
    
    async refreshTokenFlow(): Promise<string | null> {
      const notificationStore = useNotificationStore();
      const { $api } = useApiService();
      
      console.log('[AuthStore refreshTokenFlow] Initiating token refresh. Current refreshToken present:', !!this.refreshToken);

      if (!this.refreshToken) {
        console.warn('[AuthStore refreshTokenFlow] No refresh token available.');
        if (this.isAuthenticated) {
          console.log('[AuthStore refreshTokenFlow] Logging out due to missing refresh token while authenticated.');
          this.logout();
        }
        return null;
      }

      this.isRefreshingToken = true;
      console.log('[AuthStore refreshTokenFlow] isRefreshingToken set to true.');

      try {
        const response = await $api.post('/auth/refresh', { refreshToken: this.refreshToken });
        const newAccessToken = response.data.accessToken;
        this.token = newAccessToken;
        localStorage.setItem('auth_token', newAccessToken);
        this.isAuthenticated = true; // Ensure isAuthenticated is true after successful refresh
        console.log('[AuthStore refreshTokenFlow] Token refreshed successfully. New access token set. isAuthenticated:', this.isAuthenticated);
        this.isRefreshingToken = false;
        return newAccessToken;
      } catch (error: any) {
        console.error('[AuthStore refreshTokenFlow] Token refresh failed:', error.response?.data || error.message);
        if (this.isAuthenticated) {
            console.log('[AuthStore refreshTokenFlow] Logging out due to token refresh failure while authenticated.');
            this.logout(); 
        }
        this.isRefreshingToken = false;
        console.log('[AuthStore refreshTokenFlow] isRefreshingToken set to false after failure.');
        return null;
      }
    },
    
    logout() {
      const notificationStore = useNotificationStore();
      console.log('[AuthStore logout] Logging out. Current isAuthenticated state:', this.isAuthenticated);
      if (this.isAuthenticated) {
        notificationStore.show({
          type: 'info',
          message: 'Byli jste odhlášeni.'
        });
      }
      this.token = null;
      this.refreshToken = null;
      this.user = null;
      this.isAuthenticated = false;
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      console.log('[AuthStore logout] Auth state and localStorage cleared. isAuthenticated:', this.isAuthenticated);
      
      navigateTo('/login');
    }
  }
});