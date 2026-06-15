import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const form = useForm({ defaultValues: { token: searchParams.get('token') || '', password: '' } });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (values) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', values);
      setMessage('Password updated. You can login with the new password.');
    } catch (apiError) {
      console.error('Reset password failed', apiError);
      setError(getApiErrorMessage(apiError, 'Reset link is invalid, expired, or already used.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: { xs: 3, sm: 5 } }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Set new password</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={form.handleSubmit(submit)}>
          <Stack spacing={2}>
            <TextField label="Reset token" error={!!form.formState.errors.token} helperText={form.formState.errors.token?.message}
              {...form.register('token', { required: 'Reset token is required' })} />
            <TextField label="New password" type="password" autoComplete="new-password" error={!!form.formState.errors.password}
              helperText={form.formState.errors.password?.message}
              {...form.register('password', { required: 'Password is required', minLength: { value: 8, message: 'Use at least 8 characters' } })} />
            <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Updating password...' : 'Update password'}</Button>
            <Button component={Link} to="/login">Back to login</Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
