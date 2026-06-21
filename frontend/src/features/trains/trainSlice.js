import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

export const searchTrains = createAsyncThunk('trains/search', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/trains/search', payload);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Unable to search trains right now. Please try again.'));
  }
});

const trainSlice = createSlice({
  name: 'trains',
  initialState: {
    results: [],
    selectedSearch: null,
    hasSearched: false,
    loading: false,
    error: null
  },
  reducers: {
    rememberSearch(state, action) {
      state.selectedSearch = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchTrains.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.results = [];
      })
      .addCase(searchTrains.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
        state.hasSearched = true;
      })
      .addCase(searchTrains.rejected, (state, action) => {
        state.loading = false;
        state.hasSearched = true;
        state.results = [];
        state.error = action.payload || 'Unable to search trains right now. Please try again.';
      });
  }
});

export const { rememberSearch } = trainSlice.actions;
export default trainSlice.reducer;
