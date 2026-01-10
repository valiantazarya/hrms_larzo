import axios from 'axios';

// Get API URL from environment or auto-detect based on current protocol
function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // If page is loaded over HTTPS, always use HTTPS for API (prevent mixed content)
  if (window.location.protocol === 'https:') {
    // If env URL is set but uses HTTP, convert it to HTTPS
    if (envUrl && envUrl.startsWith('http://')) {
      return envUrl.replace('http://', 'https://');
    }
    // If no env URL or it's already HTTPS, use same domain
    if (!envUrl || envUrl.startsWith('https://')) {
      return `${window.location.protocol}//${window.location.host}/api/v1`;
    }
    // If env URL is HTTPS, use it
    return envUrl;
  }
  
  // Development (HTTP) - use env URL or localhost
  if (envUrl) {
    return envUrl;
  }
  
  return 'http://localhost:3000/api/v1';
}

const API_URL = getApiUrl();

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to unwrap backend response format and handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Backend wraps all responses in { statusCode, data, timestamp }
    // Unwrap it so services can use response.data directly
    if (response.data && typeof response.data === 'object' && 'data' in response.data && 'statusCode' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    // Handle connection errors
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED'))) {
      error.response = {
        data: {
          message: 'Cannot connect to server. Please check if the backend is running.',
        },
        status: 0,
      };
    }
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      // If no refresh token, immediately redirect to login
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        // Handle both wrapped and unwrapped responses
        const responseData = response.data?.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = responseData;
        
        if (accessToken && newRefreshToken) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Invalid refresh response');
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

