import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 12000
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('southrail_access_token');
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const canRetryAuth = (status === 401 || status === 403) && !original?._retry && !isAuthRequest(original?.url);
    if (canRetryAuth) {
      original._retry = true;
      const refreshToken = localStorage.getItem('southrail_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }, { timeout: api.defaults.timeout });
          localStorage.setItem('southrail_access_token', data.accessToken);
          localStorage.setItem('southrail_refresh_token', data.refreshToken);
          if (data.user) {
            localStorage.setItem('southrail_user', JSON.stringify(data.user));
          }
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch (refreshError) {
          clearAuthStorage();
          return Promise.reject(refreshError);
        }
      }
      clearAuthStorage();
    }
    return Promise.reject(error);
  }
);

function isAuthRequest(url = '') {
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
}

export function clearAuthStorage() {
  localStorage.removeItem('southrail_access_token');
  localStorage.removeItem('southrail_refresh_token');
  localStorage.removeItem('southrail_user');
  window.dispatchEvent(new Event('southrail-auth-cleared'));
}

export default api;
