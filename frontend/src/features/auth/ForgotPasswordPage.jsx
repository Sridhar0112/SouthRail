import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

export default function ForgotPasswordPage() {
  const form = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (values) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', values);
      setMessage('If an account exists for this email address, a password reset email has been sent.');
    } catch (apiError) {
      console.error('Forgot password request failed', apiError);
      setError(getApiErrorMessage(apiError, 'Password reset request could not be submitted.'));
    } finally {
      setLoading(false);
    }
  };
if (message) {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          📧 Check Your Email
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          If an account exists for this email address,
  a password reset email has been sent.
  Please check your inbox and spam folder.
        </Typography>

        <Alert severity="success" sx={{ mb: 3 }}>
          Password reset email sent successfully.
        </Alert>

        <Button
          component={Link}
          to="/login"
          variant="contained"
          fullWidth
        >
          Back to Login
        </Button>
      </Paper>
    </Container>
  );
}
  return (
    
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: { xs: 3, sm: 5 } }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Reset password</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Enter your registered email address.</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={form.handleSubmit(submit)}>
          <Stack spacing={2}>
            <TextField label="Email" autoComplete="email" error={!!form.formState.errors.email} helperText={form.formState.errors.email?.message}
              {...form.register('email', { required: 'Email is required' })} />
            <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Sending reset link...' : 'Send reset link'}</Button>
            <Button component={Link} to="/login">Back to login</Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
