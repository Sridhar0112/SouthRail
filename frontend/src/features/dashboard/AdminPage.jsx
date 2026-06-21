import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import BarChartIcon from '@mui/icons-material/BarChart';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PlaceIcon from '@mui/icons-material/Place';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TrainIcon from '@mui/icons-material/Train';
import api from '../../services/api.js';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateFeedback.jsx';
import { getApiErrorMessage, isAuthError } from '../../utils/apiErrors.js';

const pageSize = 100;
const initialFilters = {
  users: '',
  userStatus: 'ALL',
  trains: '',
  trainStatus: 'ALL',
  routes: '',
  stations: '',
  stationState: 'ALL',
  bookings: '',
  bookingStatus: 'ALL'
};

function emptyAdminData() {
  return {
    summary: null,
    users: [],
    trains: [],
    routes: [],
    stations: [],
    bookings: []
  };
}

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
        console.error(`Admin ${key} load failed`, result.reason);
        nextErrors[key] = getAdminErrorMessage(result.reason, `Unable to load admin ${key}.`);
      }
    });

    setData(nextData);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  };

  const metrics = useMemo(() => buildAdminMetrics(data), [data]);
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
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <AdminHeader lastUpdated={lastUpdated} onRefresh={loadAdminData} />

        {Object.keys(errors).length > 0 && (
          <ErrorState
            title="Some admin data could not be loaded"
            message={Object.values(errors).join('\n')}
            actionLabel="Retry"
            onAction={loadAdminData}
          />
        )}

        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 48, fontWeight: 800 }
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Users" value="users" />
          <Tab label="Trains" value="trains" />
          <Tab label="Routes" value="routes" />
          <Tab label="Stations" value="stations" />
          <Tab label="Bookings" value="bookings" />
        </Tabs>

        {activeTab === 'overview' && (
          <OverviewTab data={data} metrics={metrics} errors={errors} onRefresh={loadAdminData} />
        )}

        {activeTab === 'users' && (
          <AdminDataTable
            title="Users"
            subtitle="Registered passengers, admins, and account status"
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
  );
}

function AdminHeader({ lastUpdated, onRefresh }) {
  return (
    <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Admin Management</Typography>
          <Typography color="text.secondary">
            Operations overview for users, trains, routes, stations, and bookings.
          </Typography>
          {lastUpdated && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Last updated {formatDateTime(lastUpdated)}
            </Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRefresh}>
          Refresh
        </Button>
      </Stack>
    </Paper>
  );
}

function OverviewTab({ data, metrics, errors, onRefresh }) {
  const kpis = buildKpis(data, metrics);

  return (
    <Stack spacing={3}>
      {kpis.length > 0 ? (
        <Grid container spacing={2}>
          {kpis.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <AdminKpiCard {...item} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState title="No KPI data available" message="Admin summary data is not available right now." />
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <DistributionCard
            title="Booking status breakdown"
            subtitle="Computed from loaded booking records"
            rows={metrics.bookingStatusRows}
            emptyTitle="No booking status data"
            emptyMessage="No booking records are available for status analysis."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DistributionCard
            title="User account health"
            subtitle="Enabled and email verification status"
            rows={metrics.userStatusRows}
            emptyTitle="No user status data"
            emptyMessage="No user records are available for account analysis."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DistributionCard
            title="Train operating status"
            subtitle="Active and inactive configured trains"
            rows={metrics.trainStatusRows}
            emptyTitle="No train status data"
            emptyMessage="No train records are available for operating status analysis."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TopListCard
            title="Top booked trains"
            subtitle="Grouped by train number from booking records"
            rows={metrics.topBookedTrains}
            emptyTitle="No booking volume data"
            emptyMessage="Bookings are required before top train analysis is available."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TopListCard
            title="Station distribution"
            subtitle="Grouped by available state or city data"
            rows={metrics.stationDistribution}
            emptyTitle="No station distribution data"
            emptyMessage="Station state or city data is not available."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TopListCard
            title="Route coverage"
            subtitle="Most common source and destination pairs"
            rows={metrics.routeCoverage}
            emptyTitle="No route coverage data"
            emptyMessage="Routes are required before coverage analysis is available."
          />
        </Grid>
      </Grid>

      {Object.keys(errors).length > 0 && (
        <ErrorState
          title="Dashboard data warning"
          message="Some sections could not be loaded, so related charts may be incomplete."
          actionLabel="Retry"
          onAction={onRefresh}
        />
      )}
    </Stack>
  );
}

function AdminKpiCard({ label, value, helperText, icon, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.selected',
              color
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="body2">{label}</Typography>
            <Typography variant="h4" fontWeight={900}>{formatNumber(value)}</Typography>
            <Typography color="text.secondary" variant="body2">{helperText}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function DistributionCard({ title, subtitle, rows, emptyTitle, emptyMessage }) {
  const total = rows.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>{subtitle}</Typography>
        {total === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          <Stack spacing={1.5}>
            {rows.filter((item) => item.value > 0).map((item) => {
              const percent = Math.round((item.value / total) * 100);
              return (
                <Box key={item.label}>
                  <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
                    <Typography fontWeight={800}>{item.label}</Typography>
                    <Typography color="text.secondary">{formatNumber(item.value)} ({percent}%)</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{
                      height: 9,
                      '& .MuiLinearProgress-bar': { bgcolor: item.color || 'primary.main' }
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function TopListCard({ title, subtitle, rows, emptyTitle, emptyMessage }) {
  const max = Math.max(...rows.map((item) => item.value), 0);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>{subtitle}</Typography>
        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          <Stack spacing={1.25}>
            {rows.map((item) => {
              const percent = max > 0 ? Math.round((item.value / max) * 100) : 0;
              return (
                <Box key={item.label}>
                  <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
                    <Typography fontWeight={800}>{item.label}</Typography>
                    <Typography color="text.secondary">{formatNumber(item.value)}</Typography>
                  </Stack>
                  {item.caption && <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>{item.caption}</Typography>}
                  <LinearProgress variant="determinate" value={percent} sx={{ height: 8 }} />
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function AdminDataTable({
  title,
  subtitle,
  rows,
  columns,
  searchValue,
  onSearch,
  filterValue,
  onFilter,
  filterOptions,
  emptyTitle,
  emptyMessage,
  error,
  onRetry
}) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>{title}</Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label={`Search ${title.toLowerCase()}`}
                value={searchValue}
                onChange={(event) => onSearch(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
              {filterOptions?.length > 0 && (
                <TextField
                  size="small"
                  select
                  label="Filter"
                  value={filterValue}
                  onChange={(event) => onFilter(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                  {filterOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </Stack>

          <Divider />

          {error && <ErrorState title={`${title} unavailable`} message={error} actionLabel="Retry" onAction={onRetry} />}
          {!error && rows.length === 0 && <EmptyState title={emptyTitle} message={emptyMessage} />}
          {!error && rows.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small" aria-label={`${title} table`} sx={{ minWidth: { xs: 680, md: 720 } }}>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column.key} sx={{ fontWeight: 900, whiteSpace: 'nowrap' }}>
                        {column.header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id || row.pnr || JSON.stringify(row)} hover>
                      {columns.map((column) => (
                        <TableCell key={column.key} sx={{ minWidth: column.minWidth || 120 }}>
                          {column.render ? column.render(row) : formatValue(row[column.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function AdminStatusChip({ label, color = 'default' }) {
  return <Chip size="small" label={label} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
}

function getUserColumns() {
  return [
    { key: 'fullName', header: 'Name', minWidth: 180, render: (row) => row.fullName || '-' },
    { key: 'email', header: 'Email', minWidth: 220, render: (row) => row.email || '-' },
    { key: 'enabled', header: 'Enabled', render: (row) => <BooleanChip value={row.enabled} trueLabel="Enabled" falseLabel="Disabled" /> },
    { key: 'emailVerified', header: 'Email verified', render: (row) => <BooleanChip value={row.emailVerified} trueLabel="Verified" falseLabel="Not verified" /> },
    { key: 'roles', header: 'Roles', minWidth: 180, render: (row) => <RoleList roles={row.roles} /> }
  ];
}

function getTrainColumns(routeCountByTrain) {
  return [
    { key: 'number', header: 'Train number', render: (row) => row.number || '-' },
    { key: 'name', header: 'Train name', minWidth: 220, render: (row) => row.name || '-' },
    { key: 'category', header: 'Category', render: (row) => row.category || '-' },
    { key: 'active', header: 'Status', render: (row) => <BooleanChip value={row.active} trueLabel="Active" falseLabel="Inactive" /> },
    { key: 'routes', header: 'Route count', render: (row) => formatNumber(routeCountByTrain[row.number] || 0) }
  ];
}

function getRouteColumns() {
  return [
    { key: 'routeName', header: 'Route', minWidth: 220, render: (row) => row.routeName || '-' },
    { key: 'trainNumber', header: 'Train', render: (row) => row.trainNumber || '-' },
    {
      key: 'fromTo',
      header: 'From -> To',
      minWidth: 190,
      render: (row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={row.sourceCode || '-'} />
          <Typography color="text.secondary">to</Typography>
          <Chip size="small" label={row.destinationCode || '-'} />
        </Stack>
      )
    },
    { key: 'trainName', header: 'Train name', minWidth: 220, render: (row) => row.trainName || '-' }
  ];
}

function getStationColumns() {
  return [
    { key: 'code', header: 'Code', render: (row) => row.code || '-' },
    { key: 'name', header: 'Station name', minWidth: 240, render: (row) => row.name || '-' },
    { key: 'city', header: 'City', render: (row) => row.city || '-' },
    { key: 'state', header: 'State', render: (row) => row.state || '-' }
  ];
}

function getBookingColumns() {
  return [
    { key: 'pnr', header: 'PNR', minWidth: 140, render: (row) => row.pnr || '-' },
    { key: 'trainNumber', header: 'Train', render: (row) => row.trainNumber || '-' },
    { key: 'userEmail', header: 'User', minWidth: 220, render: (row) => row.userEmail || '-' },
    { key: 'route', header: 'Route', minWidth: 160, render: (row) => `${row.sourceCode || '-'} to ${row.destinationCode || '-'}` },
    { key: 'journeyDate', header: 'Journey date', render: (row) => formatDate(row.journeyDate) },
    { key: 'status', header: 'Status', render: (row) => <AdminStatusChip label={formatStatus(row.status)} color={getStatusColor(row.status)} /> },
    { key: 'totalFare', header: 'Total fare', render: (row) => formatCurrency(row.totalFare) }
  ];
}

function BooleanChip({ value, trueLabel, falseLabel }) {
  return value
    ? <AdminStatusChip label={trueLabel} color="success" />
    : <AdminStatusChip label={falseLabel} color="default" />;
}

function RoleList({ roles }) {
  const list = Array.isArray(roles) ? roles : Array.from(roles || []);
  if (list.length === 0) {
    return '-';
  }
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {list.map((role) => <Chip key={role} size="small" variant="outlined" label={String(role).replace('ROLE_', '')} />)}
    </Stack>
  );
}

async function fetchPagedRows(endpoint) {
  const rows = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const { data } = await api.get(`${endpoint}${separator}page=${page}&size=${pageSize}`);
    const content = Array.isArray(data) ? data : data?.content || [];
    rows.push(...content);
    totalPages = Number.isFinite(Number(data?.totalPages)) ? Number(data.totalPages) : 1;
    page += 1;
  }

  return { rows };
}

function buildAdminMetrics(data) {
  const bookingStatusCounts = countBy(data.bookings, (row) => normalizeStatus(row.status));
  const userEnabledCount = data.users.filter((row) => row.enabled).length;
  const userDisabledCount = data.users.length - userEnabledCount;
  const userVerifiedCount = data.users.filter((row) => row.emailVerified).length;
  const userUnverifiedCount = data.users.length - userVerifiedCount;
  const trainActiveCount = data.trains.filter((row) => row.active).length;
  const trainInactiveCount = data.trains.length - trainActiveCount;
  const routeCountByTrain = countBy(data.routes, (row) => row.trainNumber || 'Unknown train');

  return {
    bookingStatuses: Object.keys(bookingStatusCounts).filter(Boolean).sort(),
    stationStates: unique(data.stations.map((row) => row.state).filter(Boolean)).sort(),
    routeCountByTrain,
    confirmedBookings: bookingStatusCounts.CONFIRMED || 0,
    cancelledBookings: bookingStatusCounts.CANCELLED || 0,
    activeTrains: trainActiveCount,
    inactiveTrains: trainInactiveCount,
    bookingStatusRows: Object.entries(bookingStatusCounts).map(([label, value]) => ({
      label: formatStatus(label),
      value,
      color: statusBarColor(label)
    })),
    userStatusRows: [
      { label: 'Enabled users', value: userEnabledCount, color: 'success.main' },
      { label: 'Disabled users', value: userDisabledCount, color: 'text.disabled' },
      { label: 'Email verified', value: userVerifiedCount, color: 'primary.main' },
      { label: 'Email not verified', value: userUnverifiedCount, color: 'warning.main' }
    ],
    trainStatusRows: [
      { label: 'Active trains', value: trainActiveCount, color: 'success.main' },
      { label: 'Inactive trains', value: trainInactiveCount, color: 'text.disabled' }
    ],
    topBookedTrains: topGroups(data.bookings, (row) => row.trainNumber || 'Unknown train', (key, value, sample) => ({
      label: key,
      value,
      caption: sample?.trainName || ''
    })),
    stationDistribution: topGroups(data.stations, (row) => row.state || row.city || '', (key, value) => ({ label: key, value })),
    routeCoverage: topGroups(data.routes, (row) => `${row.sourceCode || '-'} to ${row.destinationCode || '-'}`, (key, value) => ({ label: key, value }))
  };
}

function buildKpis(data, metrics) {
  const summary = data.summary || {};
  const kpis = [];

  addKpi(kpis, summary.users, 'Total Users', 'Registered passengers and admins', <PeopleAltIcon />, 'primary.main');
  addKpi(kpis, summary.trains, 'Total Trains', 'Configured train services', <TrainIcon />, 'primary.main');
  addKpi(kpis, summary.routes, 'Total Routes', 'Operational route mappings', <AltRouteIcon />, 'secondary.main');
  addKpi(kpis, summary.stations, 'Total Stations', 'Supported stations', <PlaceIcon />, 'secondary.main');
  addKpi(kpis, summary.bookings, 'Total Bookings', 'Total reservations', <ConfirmationNumberIcon />, 'primary.main');

  if (data.bookings.length > 0) {
    addKpi(kpis, metrics.confirmedBookings, 'Confirmed Bookings', 'Confirmed reservations', <CheckCircleIcon />, 'success.main');
    addKpi(kpis, metrics.cancelledBookings, 'Cancelled Bookings', 'Cancelled reservations', <CancelIcon />, 'error.main');
  }
  if (data.trains.length > 0) {
    addKpi(kpis, metrics.activeTrains, 'Active Trains', 'Trains currently enabled', <BarChartIcon />, 'success.main');
    addKpi(kpis, metrics.inactiveTrains, 'Inactive Trains', 'Trains currently disabled', <TrainIcon />, 'text.disabled');
  }

  return kpis;
}

function addKpi(list, value, label, helperText, icon, color) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return;
  }
  list.push({ value: Number(value), label, helperText, icon, color });
}

function buildFilteredTables(data, filters, metrics) {
  const users = data.users
    .filter((row) => matchesSearch(row, ['fullName', 'email'], filters.users))
    .filter((row) => {
      if (filters.userStatus === 'ENABLED') return row.enabled;
      if (filters.userStatus === 'DISABLED') return !row.enabled;
      if (filters.userStatus === 'VERIFIED') return row.emailVerified;
      if (filters.userStatus === 'UNVERIFIED') return !row.emailVerified;
      return true;
    })
    .sort((a, b) => compareText(a.fullName || a.email, b.fullName || b.email));

  const trains = data.trains
    .filter((row) => matchesSearch(row, ['number', 'name', 'category'], filters.trains))
    .filter((row) => {
      if (filters.trainStatus === 'ACTIVE') return row.active;
      if (filters.trainStatus === 'INACTIVE') return !row.active;
      return true;
    })
    .sort((a, b) => compareText(a.number, b.number));

  const routes = data.routes
    .filter((row) => matchesSearch(row, ['routeName', 'trainNumber', 'trainName', 'sourceCode', 'destinationCode'], filters.routes))
    .sort((a, b) => compareText(a.routeName, b.routeName));

  const stations = data.stations
    .filter((row) => matchesSearch(row, ['code', 'name', 'city', 'state'], filters.stations))
    .filter((row) => filters.stationState === 'ALL' || row.state === filters.stationState)
    .sort((a, b) => compareText(a.code, b.code));

  const bookings = data.bookings
    .filter((row) => matchesSearch(row, ['pnr', 'trainNumber', 'trainName', 'userEmail', 'status', 'sourceCode', 'destinationCode'], filters.bookings))
    .filter((row) => filters.bookingStatus === 'ALL' || normalizeStatus(row.status) === filters.bookingStatus)
    .sort((a, b) => compareDateDesc(a.createdAt || a.journeyDate, b.createdAt || b.journeyDate));

  return { users, trains, routes, stations, bookings, routeCountByTrain: metrics.routeCountByTrain };
}

function countBy(rows, getKey) {
  return rows.reduce((counts, row) => {
    const key = getKey(row);
    if (!key) {
      return counts;
    }
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topGroups(rows, getKey, makeRow) {
  const counts = countBy(rows, getKey);
  return Object.entries(counts)
    .map(([key, value]) => makeRow(key, value, rows.find((row) => getKey(row) === key)))
    .sort((a, b) => b.value - a.value || compareText(a.label, b.label))
    .slice(0, 5);
}

function matchesSearch(row, fields, query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return fields.some((field) => String(row[field] || '').toLowerCase().includes(normalized));
}

function unique(values) {
  return Array.from(new Set(values));
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

function compareDateDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}

function formatStatus(status) {
  const value = normalizeStatus(status);
  return value ? value.replaceAll('_', ' ') : 'UNKNOWN';
}

function getStatusColor(status) {
  const value = normalizeStatus(status);
  if (value === 'CONFIRMED' || value === 'BOOKED') return 'success';
  if (value === 'PENDING') return 'warning';
  if (value === 'CANCELLED' || value === 'FAILED') return 'error';
  if (value === 'REFUNDED') return 'info';
  return 'default';
}

function statusBarColor(status) {
  const color = getStatusColor(status);
  if (color === 'success') return 'success.main';
  if (color === 'warning') return 'warning.main';
  if (color === 'error') return 'error.main';
  if (color === 'info') return 'info.main';
  return 'primary.main';
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Rs -';
  }
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return String(value);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

function getAdminErrorMessage(error, fallbackMessage) {
  if (isAuthError(error)) {
    return error.response?.status === 403
      ? 'You do not have permission to access admin management. Please login with an admin account.'
      : 'Please login with an admin account.';
  }
  if (error?.response?.status >= 500) {
    return 'Unable to load admin data right now. Please try again later.';
  }
  return getApiErrorMessage(error, fallbackMessage);
}
