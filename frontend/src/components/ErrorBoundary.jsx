import { Alert, Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function ErrorBoundary() {
  return (
    <Container sx={{ py: 8 }}>
      <Box sx={{ maxWidth: 680 }}>
        <Typography variant="h4" gutterBottom>Something needs attention</Typography>
        <Alert severity="error" sx={{ mb: 3 }}>The page could not be loaded. Please try again.</Alert>
        <Button component={Link} to="/" variant="contained">Return home</Button>
      </Box>
    </Container>
  );
}
