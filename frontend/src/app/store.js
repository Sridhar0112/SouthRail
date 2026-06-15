import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import trainReducer from '../features/trains/trainSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trains: trainReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});
