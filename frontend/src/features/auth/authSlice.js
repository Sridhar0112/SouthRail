import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { clearAuthStorage, setAuthStorage } from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

const savedUser = readSavedUser();

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    setAuthStorage({
      accessToken: data.accessToken || '',
      refreshToken: data.refreshToken || '',
      user: data.user || null
    });
    return data.user || null;
  } catch (error) {
    return rejectWithValue(normalizeLoginError(error));
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    return data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Registration failed. Please check your details.'));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: savedUser,
    loading: false,
    error: null,
    registrationResult: null
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.registrationResult = null;
      clearAuthStorage();
    },
    clearRegistrationResult(state) {
      state.registrationResult = null;
    },
    updateUser(state, action) {
      state.user = {
        ...state.user,
        ...action.payload
      };
      setAuthStorage({
        accessToken: localStorage.getItem('southrail_access_token') || '',
        refreshToken: localStorage.getItem('southrail_refresh_token') || '',
        user: state.user
      });
    },
    setAuthenticatedUser(state, action) {
      state.user = action.payload || null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.error.message || 'Login failed.';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registrationResult = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.registrationResult = action.payload;
        state.user = null;
        clearAuthStorage();
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Registration failed.';
      });
  }
});

function normalizeLoginError(error) {
  const data = error?.response?.data;
  return {
    message: getApiErrorMessage(error, 'Login failed. Check your email and password.'),
    status: error?.response?.status,
    lockedUntil: data && typeof data === 'object' ? data.lockedUntil : undefined
  };
}

function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('southrail_user') || 'null');
  } catch {
    clearAuthStorage();
    return null;
  }
}

export const { logout, clearRegistrationResult, updateUser, setAuthenticatedUser } = authSlice.actions;
export default authSlice.reducer;
