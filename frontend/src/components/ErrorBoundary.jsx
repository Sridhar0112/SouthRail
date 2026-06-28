import { Alert, Box, Button, Container, Typography } from '@mui/material';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

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
      <Box sx={{ maxWidth: 680 }}>
        <Typography variant="h4" gutterBottom>{title}</Typography>
        <Alert severity="error" sx={{ mb: 3 }}>{message}</Alert>
        <Button component={Link} to="/" variant="contained">Return home</Button>
      </Box>
    </Container>
  );
}
