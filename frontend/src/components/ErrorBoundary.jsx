import { Alert, Box, Button, Container, Stack, Typography } from '@mui/material';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';

export function ErrorBoundary() {
  const error = useRouteError();
  let title = 'Something needs attention';
  let message = 'The page could not be loaded. Please try again.';
  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return (
    <Container sx={{ py: 8 }}>
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'error.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 32, color: 'error.main' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>{title}</Typography>
            <Typography color="text.secondary">{message}</Typography>
          </Box>
          <Button component={Link} to="/" variant="contained" startIcon={<HomeIcon />}>
            Return home
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
