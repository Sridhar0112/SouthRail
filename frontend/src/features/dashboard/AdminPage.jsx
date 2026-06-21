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
import { alpha, useTheme } from '@mui/material/styles';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import BarChartIcon from '@mui/icons-material/BarChart';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PlaceIcon from '@mui/icons-material/Place';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TrainIcon from '@mui/icons-material/Train';
import TimelineIcon from '@mui/icons-material/Timeline';
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
    <Stack spacing={2.5}>
      <Paper
        sx={(theme) => ({
          p: { xs: 2, md: 2.5 },
          border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.28)}, ${alpha(theme.palette.background.paper, 0.92)})`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.14)}, ${alpha(theme.palette.background.paper, 0.98)})`
        })}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="overline" color="primary" fontWeight={900}>Live admin analytics</Typography>
            <Typography variant="h5" fontWeight={900}>Railway operations command center</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Charts are computed from loaded admin booking, user, train, route, and station API records. Empty sections stay explicit instead of showing sample data.
            </Typography>
          </Box>
          <Chip color="success" variant="outlined" label={`${formatNumber(data.bookings.length)} real bookings loaded`} />
        </Stack>
      </Paper>

      {kpis.length > 0 ? (
        <Grid container spacing={1.5}>
          {kpis.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <AdminMetricCard {...item} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState title="No KPI data available" message="Admin summary data is not available right now." />
      )}

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <AdminChartCard title="Active revenue trend" subtitle="Grouped by booking created date, falling back to journey date when needed">
            <RevenueTrendChart rows={metrics.revenueTrend} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <RecentBookingsPanel rows={metrics.recentBookings} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <AdminChartCard title="Booking status" subtitle="CONFIRMED, RAC, WAITLISTED, CANCELLED and other statuses stay separate">
            <DonutChart rows={metrics.bookingStatusRows} valueFormatter={formatNumber} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <AdminChartCard title="User account health" subtitle="Enabled, verification, and role mix from user records">
            <DonutChart rows={metrics.userHealthRows} valueFormatter={formatNumber} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <AdminChartCard title="Train operations" subtitle="Active fleet, route assignment, and category distribution">
            <TrainOperationsChart metrics={metrics} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <AdminChartCard title="Top revenue trains" subtitle="Active revenue only; cancelled and failed bookings excluded">
            <HorizontalBarChart rows={metrics.topRevenueTrains} valueKey="revenue" valueFormatter={formatCurrency} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <AdminChartCard title="Top booked trains" subtitle="Booking volume grouped by train number and name">
            <HorizontalBarChart rows={metrics.topBookedTrains} valueKey="value" valueFormatter={formatNumber} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <AdminChartCard title={metrics.routeDemandIsBookingBased ? 'Route demand' : 'Configured route coverage'} subtitle={metrics.routeDemandIsBookingBased ? 'Booking count grouped by source → destination' : 'Booking route data unavailable; showing configured route coverage'}>
            <HorizontalBarChart rows={metrics.routeDemand} valueKey="value" valueFormatter={formatNumber} />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <AdminChartCard title="Station distribution" subtitle="Configured station footprint by state or city">
            <HorizontalBarChart rows={metrics.stationDistribution} valueKey="value" valueFormatter={formatNumber} />
          </AdminChartCard>
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

function AdminMetricCard({ label, value, helperText, icon, color = 'primary.main', formatter = formatNumber }) {
  return (
    <Card sx={{ height: '100%', overflow: 'hidden' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={(theme) => ({
              width: 38,
              height: 38,
              flex: '0 0 auto',
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color
            })}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption" fontWeight={800} textTransform="uppercase">{label}</Typography>
            <Typography variant="h5" fontWeight={950} sx={{ lineHeight: 1.15 }}>{formatter(value)}</Typography>
            <Typography color="text.secondary" variant="caption">{helperText}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function AdminChartCard({ title, subtitle, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="h6" fontWeight={900}>{title}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>{subtitle}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function ChartEmpty({ message = 'Not enough booking data to build this chart yet.' }) {
  return <EmptyState title="No chart data" message={message} />;
}

function RevenueTrendChart({ rows }) {
  const theme = useTheme();
  if (!rows.length) return <ChartEmpty message="Revenue trend needs booking createdAt or journeyDate values." />;
  const width = 720;
  const height = 250;
  const pad = { top: 18, right: 18, bottom: 42, left: 74 };
  const maxRevenue = Math.max(...rows.map((row) => row.revenue), 1);
  const points = rows.map((row, index) => {
    const x = pad.left + (rows.length === 1 ? 0 : (index / (rows.length - 1)) * (width - pad.left - pad.right));
    const y = height - pad.bottom - (row.revenue / maxRevenue) * (height - pad.top - pad.bottom);
    return { ...row, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${pad.left},${height - pad.bottom} ${line} ${points.at(-1).x},${height - pad.bottom}`;

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Active revenue trend chart">
        <defs>
          <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity="0.34" />
            <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((tick) => {
          const y = pad.top + tick * (height - pad.top - pad.bottom);
          return <line key={tick} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={theme.palette.divider} />;
        })}
        <polygon points={area} fill="url(#revenueArea)" />
        <polyline points={line} fill="none" stroke={theme.palette.success.main} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="4" fill={theme.palette.success.main}><title>{`${formatDate(point.date)} • ${formatCurrency(point.revenue)} • ${formatNumber(point.bookings)} bookings`}</title></circle>)}
        <text x="8" y={pad.top + 5} fill={theme.palette.text.secondary} fontSize="12">{formatCurrency(maxRevenue)}</text>
        <text x="8" y={height - pad.bottom} fill={theme.palette.text.secondary} fontSize="12">Rs 0</text>
        {points.map((point, index) => (index === 0 || index === points.length - 1 || rows.length <= 5) && <text key={`${point.date}-label`} x={point.x} y={height - 14} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill={theme.palette.text.secondary} fontSize="11">{shortDate(point.date)}</text>)}
      </svg>
    </Box>
  );
}

function DonutChart({ rows, valueFormatter }) {
  const theme = useTheme();
  const validRows = rows.filter((row) => row.value > 0);
  const total = validRows.reduce((sum, row) => sum + row.value, 0);
  if (!total) return <ChartEmpty />;
  let offset = 25;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
      <Box sx={{ width: 156, height: 156, flex: '0 0 auto' }}>
        <svg viewBox="0 0 120 120" role="img" aria-label="Donut chart">
          <circle cx="60" cy="60" r={radius} fill="none" stroke={theme.palette.divider} strokeWidth="16" />
          {validRows.map((row) => {
            const dash = (row.value / total) * circumference;
            const segment = <circle key={row.label} cx="60" cy="60" r={radius} fill="none" stroke={resolveColor(theme, row.color)} strokeWidth="16" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset} pathLength={circumference} transform="rotate(-90 60 60)" />;
            offset -= dash;
            return segment;
          })}
          <text x="60" y="57" textAnchor="middle" fill={theme.palette.text.primary} fontSize="18" fontWeight="800">{formatNumber(total)}</text>
          <text x="60" y="73" textAnchor="middle" fill={theme.palette.text.secondary} fontSize="10">total</text>
        </svg>
      </Box>
      <Stack spacing={0.75} sx={{ minWidth: 0, width: '100%' }}>
        {validRows.map((row) => <LegendRow key={row.label} row={row} total={total} valueFormatter={valueFormatter} />)}
      </Stack>
    </Stack>
  );
}

function HorizontalBarChart({ rows, valueKey, valueFormatter }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 0);
  if (!rows.length || !max) return <ChartEmpty />;
  return (
    <Stack spacing={1.1}>
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        return (
          <Box key={row.label}>
            <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.5 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={850} variant="body2">{row.label}</Typography>
                {row.caption && <Typography color="text.secondary" variant="caption">{row.caption}</Typography>}
              </Box>
              <Typography fontWeight={850} variant="body2">{valueFormatter(value)}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={(value / max) * 100} sx={{ height: 9, borderRadius: 99 }} />
          </Box>
        );
      })}
    </Stack>
  );
}

function TrainOperationsChart({ metrics }) {
  const rows = [...metrics.trainStatusRows, ...metrics.trainCategoryRows.slice(0, 4)];
  return (
    <Stack spacing={1.5}>
      <HorizontalBarChart rows={rows} valueKey="value" valueFormatter={formatNumber} />
      <Divider />
      <Box>
        <Typography variant="body2" color="text.secondary">Average routes per train</Typography>
        <Typography variant="h5" fontWeight={900}>{metrics.averageRoutesPerTrain.toFixed(1)}</Typography>
      </Box>
    </Stack>
  );
}

function LegendRow({ row, total, valueFormatter }) {
  const theme = useTheme();
  const percent = Math.round((row.value / total) * 100);
  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: resolveColor(theme, row.color), flex: '0 0 auto' }} />
        <Typography variant="body2" fontWeight={800}>{row.label}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">{valueFormatter(row.value)} · {percent}%</Typography>
    </Stack>
  );
}

function RecentBookingsPanel({ rows }) {
  return (
    <AdminChartCard title="Recent booking activity" subtitle="Latest real booking records by created or journey date">
      {!rows.length ? <ChartEmpty /> : (
        <Stack spacing={1}>
          {rows.map((row) => (
            <Paper key={row.pnr || `${row.trainNumber}-${row.journeyDate}`} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={900}>{row.pnr || 'No PNR'} · {row.trainNumber || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.trainName || 'Unknown train'}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.userEmail || '-'} · {row.sourceCode || '-'} → {row.destinationCode || '-'} · {formatDate(row.journeyDate)}</Typography>
                </Box>
                <Stack alignItems="flex-end" spacing={0.5}>
                  <AdminStatusChip label={formatStatus(row.status)} color={getStatusColor(row.status)} />
                  <Typography variant="body2" fontWeight={900}>{formatCurrency(row.totalFare)}</Typography>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </AdminChartCard>
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
  const adminUserCount = data.users.filter((row) => hasRole(row.roles, 'ADMIN')).length;
  const passengerUserCount = data.users.filter((row) => hasRole(row.roles, 'PASSENGER') || !hasRole(row.roles, 'ADMIN')).length;
  const trainActiveCount = data.trains.filter((row) => row.active).length;
  const trainInactiveCount = data.trains.length - trainActiveCount;
  const routeCountByTrain = countBy(data.routes, (row) => row.trainNumber || 'Unknown train');
  const validFareBookings = data.bookings.map((row) => ({ ...row, parsedFare: parseFare(row.totalFare) })).filter((row) => row.parsedFare !== null);
  const activeFareBookings = validFareBookings.filter((row) => isRevenueBooking(row.status));
  const grossRevenue = sumBy(validFareBookings, (row) => row.parsedFare);
  const activeRevenue = sumBy(activeFareBookings, (row) => row.parsedFare);
  const routeDemandRows = buildRouteDemand(data.bookings, data.routes);

  return {
    bookingStatuses: Object.keys(bookingStatusCounts).filter(Boolean).sort(),
    stationStates: unique(data.stations.map((row) => row.state).filter(Boolean)).sort(),
    routeCountByTrain,
    confirmedBookings: bookingStatusCounts.CONFIRMED || 0,
    racBookings: bookingStatusCounts.RAC || 0,
    waitlistedBookings: (bookingStatusCounts.WAITLISTED || 0) + (bookingStatusCounts.WAITLIST || 0),
    cancelledBookings: bookingStatusCounts.CANCELLED || 0,
    failedBookings: bookingStatusCounts.FAILED || 0,
    totalBookings: data.bookings.length,
    grossRevenue,
    activeRevenue,
    cancellationRate: data.bookings.length ? ((bookingStatusCounts.CANCELLED || 0) / data.bookings.length) * 100 : 0,
    activeTrains: trainActiveCount,
    inactiveTrains: trainInactiveCount,
    revenueTrend: buildRevenueTrend(activeFareBookings),
    recentBookings: [...data.bookings].sort((a, b) => compareDateDesc(a.createdAt || a.journeyDate, b.createdAt || b.journeyDate)).slice(0, 8),
    bookingStatusRows: Object.entries(bookingStatusCounts).map(([label, value]) => ({
      label: formatStatus(label),
      value,
      color: statusBarColor(label)
    })).sort((a, b) => b.value - a.value),
    userHealthRows: [
      { label: 'Enabled', value: userEnabledCount, color: 'success.main' },
      { label: 'Disabled', value: userDisabledCount, color: 'text.disabled' },
      { label: 'Email verified', value: userVerifiedCount, color: 'primary.main' },
      { label: 'Email not verified', value: userUnverifiedCount, color: 'warning.main' },
      { label: 'Admin users', value: adminUserCount, color: 'secondary.main' },
      { label: 'Passenger users', value: passengerUserCount, color: 'info.main' }
    ],
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
    trainCategoryRows: topGroups(data.trains, (row) => row.category || '', (key, value) => ({ label: key, value, color: 'secondary.main' }), 6),
    averageRoutesPerTrain: data.trains.length ? data.routes.length / data.trains.length : 0,
    topRevenueTrains: topRevenueGroups(activeFareBookings),
    topBookedTrains: topGroups(data.bookings, (row) => trainKey(row), (key, value, sample) => ({
      label: sample?.trainNumber || key,
      value,
      caption: [sample?.trainName, `${formatNumber(value)} bookings`].filter(Boolean).join(' · ')
    }), 8),
    stationDistribution: topGroups(data.stations, (row) => row.state || row.city || '', (key, value) => ({ label: key, value }), 8),
    routeDemand: routeDemandRows.rows,
    routeDemandIsBookingBased: routeDemandRows.bookingBased
  };
}

function buildKpis(data, metrics) {
  return [
    { value: metrics.activeRevenue, label: 'Active Revenue', helperText: `Gross ${formatCurrency(metrics.grossRevenue)}`, icon: <CurrencyRupeeIcon />, color: 'success.main', formatter: formatCurrency },
    { value: metrics.totalBookings || data.summary?.bookings || 0, label: 'Total Bookings', helperText: 'All reservation records', icon: <ConfirmationNumberIcon />, color: 'primary.main' },
    { value: metrics.confirmedBookings, label: 'Confirmed Bookings', helperText: 'Confirmed reservations', icon: <CheckCircleIcon />, color: 'success.main' },
    { value: metrics.racBookings, label: 'RAC Bookings', helperText: 'Reservation against cancellation', icon: <TimelineIcon />, color: 'info.main' },
    { value: metrics.waitlistedBookings, label: 'Waitlisted Bookings', helperText: 'Waiting list reservations', icon: <ConfirmationNumberIcon />, color: 'warning.main' },
    { value: metrics.cancelledBookings, label: 'Cancelled Bookings', helperText: `${metrics.cancellationRate.toFixed(1)}% cancellation rate`, icon: <CancelIcon />, color: 'error.main' },
    { value: metrics.activeTrains, label: 'Active Trains', helperText: `${formatNumber(data.trains.length)} configured trains`, icon: <TrainIcon />, color: 'success.main' },
    { value: data.users.length || data.summary?.users || 0, label: 'Total Users', helperText: 'Registered accounts', icon: <PeopleAltIcon />, color: 'primary.main' }
  ];
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

function topGroups(rows, getKey, makeRow, limit = 5) {
  const counts = countBy(rows, getKey);
  return Object.entries(counts)
    .map(([key, value]) => makeRow(key, value, rows.find((row) => getKey(row) === key)))
    .sort((a, b) => b.value - a.value || compareText(a.label, b.label))
    .slice(0, limit);
}

function topRevenueGroups(rows) {
  const grouped = rows.reduce((acc, row) => {
    const key = trainKey(row);
    if (!key) return acc;
    acc[key] = acc[key] || {
      label: row.trainNumber || key,
      caption: row.trainName || 'Unknown train',
      revenue: 0,
      value: 0
    };
    acc[key].revenue += row.parsedFare;
    acc[key].value += 1;
    acc[key].caption = [row.trainName, `${formatNumber(acc[key].value)} bookings`].filter(Boolean).join(' · ');
    return acc;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => b.revenue - a.revenue || compareText(a.label, b.label))
    .slice(0, 8);
}

function buildRevenueTrend(rows) {
  const grouped = rows.reduce((acc, row) => {
    const date = normalizeDateKey(row.createdAt || row.journeyDate);
    if (!date) return acc;
    acc[date] = acc[date] || { date, revenue: 0, bookings: 0 };
    acc[date].revenue += row.parsedFare;
    acc[date].bookings += 1;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => compareText(a.date, b.date));
}

function buildRouteDemand(bookings, routes) {
  const bookingRows = topGroups(
    bookings,
    (row) => (row.sourceCode && row.destinationCode ? `${row.sourceCode} → ${row.destinationCode}` : ''),
    (key, value) => ({ label: key, value }),
    8
  );
  if (bookingRows.length > 0) {
    return { rows: bookingRows, bookingBased: true };
  }

  return {
    rows: topGroups(routes, (row) => (row.sourceCode && row.destinationCode ? `${row.sourceCode} → ${row.destinationCode}` : ''), (key, value) => ({ label: key, value }), 8),
    bookingBased: false
  };
}

function trainKey(row) {
  return [row.trainNumber, row.trainName].filter(Boolean).join(' · ') || 'Unknown train';
}

function parseFare(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function sumBy(rows, getValue) {
  return rows.reduce((sum, row) => sum + getValue(row), 0);
}

function isRevenueBooking(status) {
  const value = normalizeStatus(status);
  return value !== 'CANCELLED' && value !== 'FAILED';
}

function hasRole(roles, role) {
  const list = Array.isArray(roles) ? roles : Array.from(roles || []);
  return list.some((item) => String(item).toUpperCase().includes(role));
}

function normalizeDateKey(value) {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function resolveColor(theme, color) {
  if (!color) return theme.palette.primary.main;
  const [paletteKey, shade] = String(color).split('.');
  return theme.palette[paletteKey]?.[shade] || theme.palette[paletteKey]?.main || color;
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
  if (value === 'RAC') return 'info';
  if (value === 'WAITLISTED' || value === 'WAITLIST' || value === 'PENDING') return 'warning';
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

function shortDate(value) {
  const key = normalizeDateKey(value);
  if (!key) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${key}T00:00:00`));
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
