import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { register as registerUser } from './authSlice.js';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
export default function RegisterPage() {
  const form = useForm();
  const dispatch = useDispatch();
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const loading = useSelector((state) => state.auth.loading);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [showPassword, setShowPassword] =
  useState(false);
const checkPasswordStrength = (password) => {

  if (!password) {
    return '';
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 'Weak';
  if (score === 3) return 'Medium';
  if (score === 4) return 'Strong';

  return 'Very Strong';
};
  const onSubmit = async (values) => {
    setApiError('');
    setSuccessMessage('');
    setRegisteredEmail('');

    try {
      const data = await dispatch(registerUser(values)).unwrap();

      setSuccessMessage(
        data?.message || 'Account created successfully. Please verify your email before logging in.'
      );
      setRegisteredEmail(data?.email || values.email);
      form.reset();
    } catch (message) {
      setApiError(message || 'Registration failed. Please check your details.');
    }
  };

  if (successMessage) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 1.5, sm: 2.25 }, textAlign: 'center', width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.35rem', sm: '1.65rem' } }}>
            Verify your email
          </Typography>

          <Alert severity="success" sx={{ mb: 1.5, textAlign: 'left' }}>
            {successMessage}
          </Alert>

          {registeredEmail && (
            <Typography color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }}>
              Verification email sent to: <strong>{registeredEmail}</strong>
            </Typography>
          )}

          <Typography color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }}>
            Please open the verification link from your email. After verification, you can login and access your dashboard.
          </Typography>

          <Button component={Link} to="/login" variant="contained" fullWidth>
            Go to login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: { xs: 1.5, sm: 2.25 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.35rem', sm: '1.65rem' } }}>
          Create account
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }}>
          Create your SouthRail account. You will need to verify your email before logging in.
        </Typography>

        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

        <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
          <Stack spacing={1.5} sx={{ '& .MuiTextField-root': { width: '100%' } }}>
            <TextField
              label="Full name"
              error={!!form.formState.errors.fullName}
              helperText={form.formState.errors.fullName?.message}
              {...form.register('fullName', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Use at least 2 characters' }
              })}
            />

            <TextField
              label="Email"
              autoComplete="email"
              error={!!form.formState.errors.email}
              helperText={form.formState.errors.email?.message}
              type="email"
              {...form.register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' }
              })}
            />

<TextField
  label="Phone Number"
  inputProps={{ maxLength: 10 }}
  error={!!form.formState.errors.phone}
  helperText={form.formState.errors.phone?.message}
  {...form.register('phone', {
    required: 'Phone number is required',
    pattern: {
      value: /^[6-9]\d{9}$/,
      message: 'Enter a valid 10-digit mobile number'
    }
  })}
/>
<TextField
  label="Password"
  type={showPassword ? 'text' : 'password'}
  autoComplete="new-password"
  error={!!form.formState.errors.password}
  helperText={form.formState.errors.password?.message}
  {...form.register('password', {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Use at least 8 characters'
    }
  })}
  onChange={(e) => {
    setPasswordStrength(
      checkPasswordStrength(e.target.value)
    );
  }}
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword(!showPassword)}
          edge="end"
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    )
  }}
/>{passwordStrength && (
  <Typography
    variant="body2"
    sx={{
      fontWeight: 600,
      color:
        passwordStrength === 'Weak'
          ? 'error.main'
          : passwordStrength === 'Medium'
          ? 'warning.main'
          : 'success.main'
    }}
  >
    Password Strength: {passwordStrength}
  </Typography>
)}

            <Button type="submit" variant="contained" startIcon={<PersonAddIcon />} disabled={loading} fullWidth>
              {loading ? 'Creating account...' : 'Register'}
            </Button>

            <Button component={Link} to="/login" fullWidth>
              Already have an account? Login
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}