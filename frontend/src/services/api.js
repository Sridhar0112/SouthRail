import axios from 'axios';

const ACCESS_TOKEN_KEY = 'southrail_access_token';
const REFRESH_TOKEN_KEY = 'southrail_refresh_token';
const USER_KEY = 'southrail_user';

let inMemoryAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || '';
let refreshPromise = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 12000
});

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
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
    const canRetryAuth = status === 401 && !original?._retry && !isAuthRequest(original?.url);

    if (!canRetryAuth) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const data = await refreshTokens();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      clearAuthStorage();
      return Promise.reject(refreshError);
    }
  }
);

export function getAccessToken() {
  return inMemoryAccessToken || localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export function setAuthStorage({ accessToken = '', refreshToken = '', user = null } = {}) {
  inMemoryAccessToken = accessToken || '';

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }

  window.dispatchEvent(new CustomEvent('southrail-auth-updated', { detail: { user } }));
}

export function clearAuthStorage() {
  inMemoryAccessToken = '';
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('southrail-auth-cleared'));
}

async function refreshTokens() {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearAuthStorage();
      return Promise.reject(new Error('Refresh token is not available.'));
    }

    refreshPromise = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }, { timeout: api.defaults.timeout })
      .then(({ data }) => {
        setAuthStorage({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user || readSavedUser()
        });
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function isAuthRequest(url = '') {
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
}

function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export default api;
