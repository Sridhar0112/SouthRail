import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

const savedUser = JSON.parse(localStorage.getItem('southrail_user') || 'null');

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('southrail_access_token', data.accessToken);
    localStorage.setItem('southrail_refresh_token', data.refreshToken);
    localStorage.setItem('southrail_user', JSON.stringify(data.user));
    return data.user;
  } catch (error) {
     console.error('Login failed', error);

  return rejectWithValue(
    error?.response?.data || {
      message: getApiErrorMessage(
        error,
        'Login failed. Check your email and password.'
      )
    }
  );

  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    return data;
  } catch (error) {
    console.error('Registration failed', error);
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
      localStorage.removeItem('southrail_access_token');
      localStorage.removeItem('southrail_refresh_token');
      localStorage.removeItem('southrail_user');
    },
    clearRegistrationResult(state) {
      state.registrationResult = null;
    },
    updateUser(state, action) {
  state.user = {
    ...state.user,
    ...action.payload
  };

  localStorage.setItem(
    'southrail_user',
    JSON.stringify(state.user)
  );
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
        state.error = action.payload || action.error.message || 'Login failed.';
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

        localStorage.removeItem('southrail_access_token');
        localStorage.removeItem('southrail_refresh_token');
        localStorage.removeItem('southrail_user');
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Registration failed.';
      });
  }
});

export const { logout, clearRegistrationResult,updateUser } = authSlice.actions;
export default authSlice.reducer;