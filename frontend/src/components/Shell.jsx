import { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Avatar, Box, Button, Container, Divider,
  IconButton, ListItemIcon, Menu, MenuItem,
  Stack, Toolbar, Tooltip, Typography
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import TrainIcon from '@mui/icons-material/Train';
import { ColorModeContext } from '../theme/AppThemeProvider.jsx';
import { logout } from '../features/auth/authSlice.js';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export function Shell() {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const clearAuth = () => dispatch(logout());
    window.addEventListener('southrail-auth-cleared', clearAuth);
    return () => window.removeEventListener('southrail-auth-cleared', clearAuth);
  }, [dispatch]);

  const signOut = () => {
    handleMenuClose();
    dispatch(logout());
    navigate('/');
  };

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const navButtonSx = {
    color: 'text.secondary',
    px: 1.5,
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' }
  };

  const displayName = auth.user?.fullName || auth.user?.name || '';
  const initials = getInitials(displayName);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} color="inherit">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 1, sm: 2 }, minHeight: { xs: 64, sm: 68 } }}>
            {/* Logo */}
            <Stack
              component={Link}
              to="/"
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mr: 'auto',
                py: 0.75,
                pr: 1.25,
                borderRadius: 2,
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <TrainIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>SouthRail</Typography>
            </Stack>

            {/* Nav links */}
            <Button component={Link} to="/pnr" sx={navButtonSx}>PNR</Button>
            {auth.user && <Button component={Link} to="/dashboard" sx={navButtonSx}>Dashboard</Button>}
             {auth.user && <Button component={Link} to="/support" sx={navButtonSx}>Support</Button>}
            {auth.user?.roles?.includes('ROLE_ADMIN') && (
              <Button component={Link} to="/admin" sx={navButtonSx}>Admin</Button>
            )}

            {/* Dark/light toggle */}
            <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
              <IconButton
                onClick={toggleColorMode}
                color="primary"
                sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
              >
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Auth: avatar menu or login */}
            {auth.user ? (
              <>
                <Tooltip title="Account">
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'primary.main',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: 2,
                        borderColor: anchorEl ? 'primary.main' : 'transparent',
                        transition: 'border-color 0.15s'
                      }}
                    >
                      {initials || <AccountCircleIcon fontSize="small" />}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      elevation: 3,
                      sx: { mt: 1, minWidth: 200, borderRadius: 2 }
                    }
                  }}
                >
                  {/* Identity block */}
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {displayName || 'Passenger'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {auth.user?.email || ''}
                    </Typography>
                  </Box>

                  <Divider />

                  <MenuItem
                    component={Link}
                    to="/dashboard"
                    onClick={handleMenuClose}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                    Dashboard
                  </MenuItem>

                  <MenuItem
                    component={Link}
                    to="/profile"
                    onClick={handleMenuClose}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    Profile
                  </MenuItem>
                  <MenuItem
  component={Link}
  to="/my-tickets"
  onClick={handleMenuClose}
  sx={{ py: 1.25 }}
>
  <ListItemIcon>
    <ConfirmationNumberIcon fontSize="small" />
  </ListItemIcon>
  My Tickets
</MenuItem>
{auth.user?.roles?.includes('ROLE_ADMIN') && (
  <MenuItem
    component={Link}
    to="/admin/support-tickets"
    onClick={handleMenuClose}
    sx={{ py: 1.25 }}
  >
    <ListItemIcon>
      <SupportAgentIcon fontSize="small" />
    </ListItemIcon>
    Support Tickets
  </MenuItem>
)}
                  <Divider />

                  <MenuItem onClick={signOut} sx={{ py: 1.25, color: 'error.main' }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                    </ListItemIcon>
                    Sign out
                  </MenuItem>

                </Menu>
              </>
            ) : (
              <Button variant="contained" component={Link} to="/login">Login</Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Outlet />
    </Box>
  );
}