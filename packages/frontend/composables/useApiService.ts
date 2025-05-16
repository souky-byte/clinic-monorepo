import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosRequestHeaders } from 'axios';
import { useRuntimeConfig } from 'nuxt/app';
import { useAuthStore } from '~/stores/auth';
import { useLoadingStore } from '~/stores/loading';
import { useNotificationStore } from '~/stores/notification';

// Define an extended Axios config interface that includes _retry
interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export function useApiService() {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const loadingStore = useLoadingStore();
  const notificationStore = useNotificationStore();
  
  const apiInstance: AxiosInstance = axios.create({
    baseURL: config.public.apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Request interceptor
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      loadingStore.startLoading();
      
      // Add auth token to headers if available
      console.log('[ApiService Request Interceptor] authStore.token:', authStore.token);
      if (authStore.token) {
        config.headers = (config.headers || {}) as AxiosRequestHeaders;
        config.headers.Authorization = `Bearer ${authStore.token}`;
        console.log('[ApiService Request Interceptor] Authorization header set:', config.headers.Authorization);
      } else {
        console.warn('[ApiService Request Interceptor] No token found in authStore.');
      }
      
      return config;
    },
    (error) => {
      loadingStore.finishLoading();
      return Promise.reject(error);
    }
  );
  
  // Response interceptor
  apiInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      loadingStore.finishLoading();
      return response;
    },
    async (error) => {
      loadingStore.finishLoading();
      const originalRequest = error.config as AxiosRequestConfigWithRetry;

      // Handle authentication errors specifically for token refresh
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        // Prevent retry for login and refresh endpoints to avoid loops
        if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh') {
          // For login/refresh failures, let the error propagate to be handled by the calling function or a general error handler
          // authStore.logout(); // Logout is now handled within refreshTokenFlow or by the original caller for login failure
          // notificationStore.show is also handled by specific flows or general error handler
          return Promise.reject(error);
        }

        if (!authStore.isRefreshingToken) {
          authStore.isRefreshingToken = true; // Handled by store, but ensure it's set if direct access
          try {
            const newAccessToken = await authStore.refreshTokenFlow();
            if (newAccessToken) {
              originalRequest._retry = true; // Mark that this request has been retried
              if (originalRequest.headers) {
                (originalRequest.headers as AxiosRequestHeaders)['Authorization'] = `Bearer ${newAccessToken}`;
              }
              return apiInstance(originalRequest); // Retry the original request with the new token
            } else {
              // refreshTokenFlow returned null, meaning refresh failed and logout was called.
              // The error that caused logout (e.g. invalid refresh token) is already handled by refreshTokenFlow.
              // So, just reject this current error to stop further processing of this specific failed request.
              return Promise.reject(error);
            }
          } catch (refreshError) {
            // This catch is if refreshTokenFlow itself throws an unhandled error, 
            // though it's designed to return null on failure and handle logout internally.
            // authStore.logout(); // Ensure logout if anything unexpected happens
            return Promise.reject(refreshError);
          } finally {
            // authStore.isRefreshingToken = false; // Handled by store
          }
        } else {
          // Is already refreshing token, wait for it to complete
          // This is a simplified way to handle concurrent requests. 
          // A more robust solution would use a queue or a shared promise.
          return new Promise((resolve, reject) => {
            const intervalId = setInterval(() => {
              if (!authStore.isRefreshingToken) {
                clearInterval(intervalId);
                if (authStore.token) { // If token was refreshed successfully by another request
                  if (originalRequest.headers) {
                     (originalRequest.headers as AxiosRequestHeaders)['Authorization'] = `Bearer ${authStore.token}`;
                  }
                  originalRequest._retry = true; // Mark as retried
                  resolve(apiInstance(originalRequest));
                } else {
                  // Token was not refreshed (e.g., refresh failed, user logged out)
                  reject(error); 
                }
              }
            }, 100);
          });
        }
      }
      
      // Handle other server errors (e.g., 500)
      if (error.response?.status >= 500) {
        notificationStore.show({
          type: 'error',
          message: 'Na serveru došlo k chybě. Zkuste to prosím později.',
        });
      }
      
      return Promise.reject(error);
    }
  );
  
  return {
    $api: apiInstance,
  };
}