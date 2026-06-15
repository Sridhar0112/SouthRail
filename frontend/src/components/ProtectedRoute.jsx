import { Navigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Container } from '@mui/material';
import { ErrorState } from './StateFeedback.jsx';

export function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location, message: 'Your session has expired. Please login again.' }} />;
  }
  if (role && !user.roles?.includes(role)) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <ErrorState title="Access denied" message="You do not have permission to open this page.">
          <Button component={Link} to="/" variant="contained">Back to Search</Button>
        </ErrorState>
      </Container>
    );
  }
  return children;
}
