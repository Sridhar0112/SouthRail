import { useState } from 'react';
import { Button, CircularProgress, Divider, Typography } from '@mui/material';

export function googleAuthorizationUrl() {
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  return `${base}/oauth2/authorization/google`;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" width="18" height="18">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.8 2.7-6.5Z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2L12 13.5c-.8.6-1.9.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M4 10.7A5.4 5.4 0 0 1 4 7.3V5H1a9 9 0 0 0 0 8l3-2.3Z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A8.7 8.7 0 0 0 9 0a9 9 0 0 0-8 5l3 2.3c.7-2.1 2.7-3.7 5-3.7Z" />
    </svg>
  );
}

export default function GoogleSignInButton() {
  const [starting, setStarting] = useState(false);

  const start = () => {
    if (starting) return;
    setStarting(true);
    window.location.assign(googleAuthorizationUrl());
  };

  return (
    <>
      <Divider sx={{ my: 0.5 }}>
        <Typography variant="caption" color="text.secondary">OR</Typography>
      </Divider>
      <Button
        type="button"
        variant="outlined"
        fullWidth
        disabled={starting}
        onClick={start}
        aria-label="Continue with Google"
        startIcon={starting ? <CircularProgress size={18} /> : <GoogleIcon />}
        sx={{ py: 1.2, borderRadius: 2, textTransform: 'none' }}
      >
        {starting ? 'Connecting to Google…' : 'Continue with Google'}
      </Button>
    </>
  );
}
