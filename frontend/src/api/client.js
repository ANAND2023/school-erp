import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Token, BranchId, and AcademicYearId
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken, activeAcademicYearId, activeBranchId } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (activeAcademicYearId) {
      config.headers['X-Academic-Year'] = String(activeAcademicYearId);
    }

    if (activeBranchId) {
      config.headers['X-Branch-Id'] = String(activeBranchId);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, accessToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
        const response = await axios.post(`${baseURL}/auth/refresh-token`, {
          accessToken,
          refreshToken,
        });

        const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data;
        setTokens(newAccess, newRefresh);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
