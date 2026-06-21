import { useEffect, useMemo, useState } from 'react';
import { Box, Container, Paper, Stack, Tab, Tabs } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PlaceIcon from '@mui/icons-material/Place';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import TrainIcon from '@mui/icons-material/Train';
import api from '../../services/api.js';
import { ErrorState, LoadingState } from '../../components/StateFeedback.jsx';
import {
  buildAdminMetricsWithKpis,
  buildFilteredTables,
  emptyAdminData,
  fetchPagedRows,
  initialFilters
} from './adminAnalytics.js';
import { formatStatus, getAdminErrorMessage } from './adminFormatters.js';
import {
  AdminDataTable,
  AdminHeader,
  OverviewTab,
  getBookingColumns,
  getRouteColumns,
  getStationColumns,
  getTrainColumns,
  getUserColumns
} from './AdminDashboardSections.jsx';

const TAB_ITEMS = [
  { value: 'overview', label: 'Overview', icon: <SpaceDashboardIcon fontSize="small" /> },
  { value: 'users', label: 'Users', icon: <PeopleAltIcon fontSize="small" /> },
  { value: 'trains', label: 'Trains', icon: <TrainIcon fontSize="small" /> },
  { value: 'routes', label: 'Routes', icon: <AltRouteIcon fontSize="small" /> },
  { value: 'stations', label: 'Stations', icon: <PlaceIcon fontSize="small" /> },
  { value: 'bookings', label: 'Bookings', icon: <ConfirmationNumberIcon fontSize="small" /> }
];

export default function AdminPage() {
  const [data, setData] = useState(emptyAdminData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState(initialFilters);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setData(emptyAdminData());
    setErrors({});

    const requests = [
      ['summary', () => api.get('/admin/summary')],
      ['users', () => fetchPagedRows('/admin/users')],
      ['trains', () => fetchPagedRows('/admin/trains')],
      ['routes', () => fetchPagedRows('/admin/routes')],
      ['stations', () => fetchPagedRows('/admin/stations')],
      ['bookings', () => fetchPagedRows('/admin/bookings')]
    ];

    const results = await Promise.allSettled(requests.map(([, request]) => request()));
    const nextData = emptyAdminData();
    const nextErrors = {};

    results.forEach((result, index) => {
      const [key] = requests[index];
      if (result.status === 'fulfilled') {
        nextData[key] = key === 'summary' ? result.value.data : result.value.rows;
      } else {
        nextErrors[key] = getAdminErrorMessage(result.reason, `Unable to load admin ${key}.`);
      }
    });

    setData(nextData);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  };

  const metrics = useMemo(() => buildAdminMetricsWithKpis(data), [data]);
  const tables = useMemo(() => buildFilteredTables(data, filters, metrics), [data, filters, metrics]);
  const hasAnyData = Boolean(data.summary) || ['users', 'trains', 'routes', 'stations', 'bookings'].some((key) => data[key].length > 0);
  const accessError = Object.values(errors).find((message) => /permission|admin account|login/i.test(message));
  const firstError = Object.values(errors)[0];

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <LoadingState message="Loading admin data..." />
      </Container>
    );
  }

  if (!hasAnyData && firstError) {
    return (
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <ErrorState
          title="Admin management unavailable"
          message={accessError || firstError}
          actionLabel="Retry"
          onAction={loadAdminData}
        />
      </Container>
    );
  }

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100%',
        pb: { xs: 4, md: 6 },
        background: theme.palette.mode === 'dark'
          ? `radial-gradient(1200px 480px at 12% -10%, ${alpha(theme.palette.primary.main, 0.16)}, transparent 60%)`
          : `radial-gradient(1200px 480px at 12% -10%, ${alpha(theme.palette.primary.main, 0.08)}, transparent 60%)`
      })}
    >
      <Container maxWidth="xl" sx={{ pt: { xs: 2.5, md: 4 } }}>
        <Stack spacing={2.5}>
          <AdminHeader lastUpdated={lastUpdated} onRefresh={loadAdminData} metrics={metrics} />

          {Object.keys(errors).length > 0 && (
            <ErrorState
              title="Some admin data could not be loaded"
              message={Object.values(errors).join('\n')}
              actionLabel="Retry"
              onAction={loadAdminData}
            />
          )}

          <Paper
            elevation={0}
            sx={(theme) => ({
              p: { xs: 0.75, md: 1 },
              borderRadius: 3,
              border: `1px solid ${theme.palette.custom?.cardBorder || theme.palette.divider}`,
              bgcolor: theme.palette.surface?.raised || theme.palette.background.paper,
              boxShadow: theme.palette.custom?.cardShadow || theme.shadows[1]
            })}
          >
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              TabIndicatorProps={{ sx: { height: 3, borderRadius: 99 } }}
              sx={{
                minHeight: 44,
                '& .MuiTab-root': {
                  minHeight: 44,
                  fontWeight: 800,
                  borderRadius: 2,
                  mx: 0.25,
                  gap: 0.75,
                  '&.Mui-selected': { color: 'primary.main' }
                }
              }}
            >
              {TAB_ITEMS.map((tab) => (
                <Tab key={tab.value} value={tab.value} icon={tab.icon} iconPosition="start" label={tab.label} />
              ))}
            </Tabs>
          </Paper>

          {activeTab === 'overview' && (
            <OverviewTab metrics={metrics} errors={errors} onRefresh={loadAdminData} />
          )}

          {activeTab === 'users' && (
            <AdminDataTable
              title="Users"
              subtitle="Registered passengers, admins, and account status"
              icon={<PeopleAltIcon />}
              rows={tables.users}
              columns={getUserColumns()}
              searchValue={filters.users}
              onSearch={(value) => updateFilter('users', value)}
              filterValue={filters.userStatus}
              onFilter={(value) => updateFilter('userStatus', value)}
              filterOptions={[
                { value: 'ALL', label: 'All users' },
                { value: 'ENABLED', label: 'Enabled' },
                { value: 'DISABLED', label: 'Disabled' },
                { value: 'VERIFIED', label: 'Email verified' },
                { value: 'UNVERIFIED', label: 'Email not verified' }
              ]}
              emptyTitle="No users found"
              emptyMessage="No users match the current search or filter."
              error={errors.users}
              onRetry={loadAdminData}
            />
          )}

          {activeTab === 'trains' && (
            <AdminDataTable
              title="Trains"
              subtitle="Configured railway services and active operating status"
              icon={<TrainIcon />}
              rows={tables.trains}
              columns={getTrainColumns(metrics.routeCountByTrain)}
              searchValue={filters.trains}
              onSearch={(value) => updateFilter('trains', value)}
              filterValue={filters.trainStatus}
              onFilter={(value) => updateFilter('trainStatus', value)}
              filterOptions={[
                { value: 'ALL', label: 'All trains' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' }
              ]}
              emptyTitle="No trains configured"
              emptyMessage="No trains match the current search or filter."
              error={errors.trains}
              onRetry={loadAdminData}
            />
          )}

          {activeTab === 'routes' && (
            <AdminDataTable
              title="Routes"
              subtitle="Operational train route mappings"
              icon={<AltRouteIcon />}
              rows={tables.routes}
              columns={getRouteColumns()}
              searchValue={filters.routes}
              onSearch={(value) => updateFilter('routes', value)}
              emptyTitle="No routes configured"
              emptyMessage="No routes match the current search."
              error={errors.routes}
              onRetry={loadAdminData}
            />
          )}

          {activeTab === 'stations' && (
            <AdminDataTable
              title="Stations"
              subtitle="Supported railway stations and service locations"
              icon={<PlaceIcon />}
              rows={tables.stations}
              columns={getStationColumns()}
              searchValue={filters.stations}
              onSearch={(value) => updateFilter('stations', value)}
              filterValue={filters.stationState}
              onFilter={(value) => updateFilter('stationState', value)}
              filterOptions={[
                { value: 'ALL', label: 'All states' },
                ...metrics.stationStates.map((state) => ({ value: state, label: state }))
              ]}
              emptyTitle="No stations configured"
              emptyMessage="No stations match the current search or filter."
              error={errors.stations}
              onRetry={loadAdminData}
            />
          )}

          {activeTab === 'bookings' && (
            <AdminDataTable
              title="Bookings"
              subtitle="Reservation operations, journey dates, and lifecycle status"
              icon={<ConfirmationNumberIcon />}
              rows={tables.bookings}
              columns={getBookingColumns()}
              searchValue={filters.bookings}
              onSearch={(value) => updateFilter('bookings', value)}
              filterValue={filters.bookingStatus}
              onFilter={(value) => updateFilter('bookingStatus', value)}
              filterOptions={[
                { value: 'ALL', label: 'All statuses' },
                ...metrics.bookingStatuses.map((status) => ({ value: status, label: formatStatus(status) }))
              ]}
              emptyTitle="No bookings yet"
              emptyMessage="No bookings match the current search or filter."
              error={errors.bookings}
              onRetry={loadAdminData}
            />
          )}
        </Stack>
      </Container>
    </Box>
  );
}