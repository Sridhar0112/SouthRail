import { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Avatar, Box, Button, Container, Divider,
  Drawer,
  IconButton, ListItemIcon, Menu, MenuItem,
  Stack, Toolbar, Tooltip, Typography,
  List, ListItemButton, ListItemText
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const clearAuth = () => dispatch(logout());
    window.addEventListener('southrail-auth-cleared', clearAuth);
    return () => window.removeEventListener('southrail-auth-cleared', clearAuth);
  }, [dispatch]);

  const location = useLocation();

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    handleMenuClose();
    closeMobileNav();
  }, [location.pathname]);

  const signOut = () => {
    handleMenuClose();
    dispatch(logout());
    navigate('/');
  };

  const navButtonSx = {
    color: 'text.secondary',
    px: { xs: 0.75, sm: 1.5 },
    minWidth: 'auto',
    fontSize: { xs: '0.78rem', sm: '0.875rem' },
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' }
  };

  const displayName = auth.user?.fullName || auth.user?.name || '';
  const initials = getInitials(displayName);
  const navItems = [
    { label: 'PNR', to: '/pnr', show: true },
    { label: 'Dashboard', to: '/dashboard', show: Boolean(auth.user) },
    { label: 'Support', to: '/support', show: Boolean(auth.user) },
    { label: 'Admin', to: '/admin', show: auth.user?.roles?.includes('ROLE_ADMIN') }
  ].filter((item) => item.show);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} color="inherit">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 64, sm: 68 }, py: { xs: 0.75, md: 0 } }}>
            {/* Logo */}
            <Stack
              component={Link}
              to="/"
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mr: { xs: 'auto', md: 'auto' },
                minWidth: 0,
                py: 0.75,
                pr: 1.25,
                borderRadius: 2,
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <TrainIcon color="primary" />
              <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>SouthRail</Typography>
            </Stack>

            {/* Nav links */}
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {navItems.map((item) => (
                <Button key={item.to} component={Link} to={item.to} sx={navButtonSx}>
                  {item.label}
                </Button>
              ))}
            </Stack>

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
              <Button variant="contained" component={Link} to="/login" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Login</Button>
            )}
            <Tooltip title="Open navigation">
              <IconButton
                color="primary"
                onClick={() => setMobileNavOpen(true)}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, bgcolor: 'action.hover' }}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer
        anchor="right"
        open={mobileNavOpen}
        onClose={closeMobileNav}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 32px)', sm: 360 },
            maxWidth: '100vw',
            p: 2
          }
        }}
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <TrainIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>SouthRail</Typography>
            </Stack>
            <IconButton onClick={closeMobileNav} aria-label="Close navigation menu">
              <MenuIcon />
            </IconButton>
          </Stack>
          <Divider />
          <List disablePadding>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                onClick={closeMobileNav}
                sx={{ borderRadius: 2, py: 1.25 }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: 800 }}
                />
              </ListItemButton>
            ))}
            {!auth.user && (
              <ListItemButton
                component={Link}
                to="/login"
                onClick={closeMobileNav}
                sx={{ borderRadius: 2, py: 1.25 }}
              >
                <ListItemText primary="Login" primaryTypographyProps={{ fontWeight: 800 }} />
              </ListItemButton>
            )}
          </List>
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              Theme and account controls remain available in the header.
            </Typography>
          </Box>
        </Stack>
      </Drawer>
      <Outlet />
    </Box>
  );
}
