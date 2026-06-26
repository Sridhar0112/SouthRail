import { Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h4" fontWeight={900}>Page not found</Typography>
          <Typography color="text.secondary">
            The SouthRail page you are looking for does not exist or may have moved.
          </Typography>
          <Button component={Link} to="/" variant="contained">Return to search</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
