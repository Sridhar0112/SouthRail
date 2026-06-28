import { useContext, useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isPageSettling, setIsPageSettling] = useState(true);
  const avatarButtonRef = useRef(null);
  const pageSettleTimerRef = useRef(null);

  useEffect(() => {
    const clearAuth = () => dispatch(logout());
    window.addEventListener('southrail-auth-cleared', clearAuth);
    return () => {
      window.removeEventListener('southrail-auth-cleared', clearAuth);
    };
  }, [dispatch]);

  const closeAllMenus = () => {
    setAnchorEl(null);
    setMobileNavOpen(false);
  };

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMobileNavOpen(false);

    if (isPageSettling) {
      closeAllMenus();
      return;
    }

    if (anchorEl) {
      setAnchorEl(null);
      return;
    }

    setAnchorEl(event.currentTarget);
  };

  const goTo = (path) => {
    closeAllMenus();

    if (location.pathname !== path) {
      navigate(path);
    }
  };

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!anchorEl) return;

      const clickedAvatar = avatarButtonRef.current?.contains(event.target);
      const clickedMenu = document.querySelector('[role="menu"]')?.contains(event.target);

      if (!clickedAvatar && !clickedMenu) {
        closeAllMenus();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick, true);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    closeAllMenus();
    setIsPageSettling(true);

    if (pageSettleTimerRef.current) {
      clearTimeout(pageSettleTimerRef.current);
    }

    pageSettleTimerRef.current = setTimeout(() => {
      setIsPageSettling(false);
      pageSettleTimerRef.current = null;
    }, 1000);

    return () => {
      if (pageSettleTimerRef.current) {
        clearTimeout(pageSettleTimerRef.current);
        pageSettleTimerRef.current = null;
      }
    };
  }, [location.pathname, location.search, location.hash]);

  const signOut = () => {
    closeAllMenus();
    dispatch(logout());
    navigate('/');
  };

  const navButtonSx = {
    color: 'text.secondary',
    px: { xs: 0.75, sm: 1.2 },
    minWidth: 'auto',
    fontSize: { xs: '0.76rem', sm: '0.82rem' },
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
          <Toolbar disableGutters sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 44, sm: 48 }, py: { xs: 0.25, md: 0 } }}>
            {/* Logo */}
            <Stack
              component={Link}
              to="/"
              onClick={closeAllMenus}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mr: 'auto',
                minWidth: 0,
                maxWidth: { xs: 'min(44vw, 180px)', sm: 'none' },
                py: 0.4,
                pr: 1,
                borderRadius: 2,
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <TrainIcon color="primary" sx={{ flexShrink: 0, fontSize: 19 }} />
              <Typography variant="h6" fontWeight={800} noWrap sx={{ fontSize: { xs: '0.9rem', sm: '0.96rem' }, minWidth: 0 }}>SouthRail</Typography>
            </Stack>

            {/* Nav links */}
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {navItems.map((item) => (
                <Button key={item.to} component={Link} to={item.to} onClick={closeAllMenus} sx={navButtonSx}>
                  {item.label}
                </Button>
              ))}
            </Stack>

            {/* Dark/light toggle */}
            <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
              <IconButton
                onClick={() => {
                  closeAllMenus();
                  toggleColorMode();
                }}
                color="primary"
                sx={{ width: 30, height: 28, bgcolor: 'action.hover', flexShrink: 0, '&:hover': { bgcolor: 'action.selected' } }}
                aria-label="Toggle theme"
              >
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Auth: avatar menu or login */}
            {auth.user ? (
              <>
                <Tooltip title="Account">
                  <IconButton
                    ref={avatarButtonRef}
                    onClick={handleMenuOpen}
                    aria-disabled={isPageSettling ? 'true' : undefined}
                    aria-haspopup="menu"
                    aria-expanded={anchorEl ? 'true' : undefined}
                    sx={{
                      p: 0,
                      flexShrink: 0,
                      cursor: isPageSettling ? 'default' : 'pointer'
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 30,
                        height: 28,
                        bgcolor: 'primary.main',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: 1,
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
                  onClose={closeAllMenus}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      elevation: 3,
                      sx: { mt: 1, width: { xs: 'calc(100vw - 32px)', sm: 280 }, maxWidth: 320, borderRadius: 2 }
                    }
                  }}
                >
                  {/* Identity block */}
                  <Box sx={{ px: 2, py: 1.5, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
                      {displayName || 'Passenger'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: '100%' }}>
                      {auth.user?.email || ''}
                    </Typography>
                  </Box>

                  <Divider />

                  <MenuItem onClick={() => goTo('/dashboard')} sx={{ py: 0.75 }}>
                    <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                    Dashboard
                  </MenuItem>

                  <MenuItem onClick={() => goTo('/profile')} sx={{ py: 0.75 }}>
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    Profile
                  </MenuItem>
                  <MenuItem onClick={() => goTo('/my-tickets')} sx={{ py: 0.75 }}>
                    <ListItemIcon>
                      <ConfirmationNumberIcon fontSize="small" />
                    </ListItemIcon>
                    My Tickets
                  </MenuItem>

                  {auth.user?.roles?.includes('ROLE_ADMIN') && (
                    <MenuItem onClick={() => goTo('/admin/support-tickets')} sx={{ py: 0.75 }}>
                      <ListItemIcon>
                        <SupportAgentIcon fontSize="small" />
                      </ListItemIcon>
                      Support Tickets
                    </MenuItem>
                  )}
                  <Divider />

                  <MenuItem onClick={signOut} sx={{ py: 0.75, color: 'error.main' }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                    </ListItemIcon>
                    Sign out
                  </MenuItem>

                </Menu>
              </>
            ) : (
              <Button variant="contained" component={Link} to="/login" onClick={closeAllMenus} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Login</Button>
            )}
            <Tooltip title="Open navigation">
              <IconButton
                color="primary"
                onClick={() => {
                  setAnchorEl(null);
                  setMobileNavOpen(true);
                }}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, width: 30, height: 28, bgcolor: 'action.hover', flexShrink: 0 }}
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
        onClose={closeAllMenus}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 32px)', sm: 360 },
            maxWidth: '100vw',
            p: 1.5
          }
        }}
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <TrainIcon color="primary" />
              <Typography variant="h6" fontWeight={800} noWrap sx={{ minWidth: 0 }}>SouthRail</Typography>
            </Stack>
            <IconButton onClick={closeAllMenus} aria-label="Close navigation menu">
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
                onClick={closeAllMenus}
                sx={{ borderRadius: 2, py: 0.9, minHeight: 34 }}
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
                onClick={closeAllMenus}
                sx={{ borderRadius: 2, py: 0.9, minHeight: 34 }}
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
