// Dashboard UI sections and reusable visual components.
// This file renders data prepared by adminAnalytics.js — it does not
// perform aggregation itself (beyond trivial array slicing for display).

import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TrainIcon from '@mui/icons-material/Train';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { EmptyState, ErrorState } from '../../components/StateFeedback.jsx';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatStatus,
  formatValue,
  getStatusColor,
  resolveColor,
  statusBarColor
} from './adminFormatters.js';

const ICONS = {
  currency: <CurrencyRupeeIcon />,
  ticket: <ConfirmationNumberIcon />,
  check: <CheckCircleIcon />,
  timeline: <TimelineIcon />,
  cancel: <CancelIcon />,
  train: <TrainIcon />,
  people: <PeopleAltIcon />
};

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Day-wise' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' }
];

const OVERVIEW_SECTION_TABS = [
  { value: 'journey', label: 'Journey Trend' },
  { value: 'trains', label: 'Train Performance' },
  { value: 'routes', label: 'Route Performance' },
  { value: 'risk', label: 'Risk & Status' },
  { value: 'users', label: 'User Health' },
  { value: 'recent', label: 'Recent Records' }
];

/* ---------------------------------- header --------------------------------- */

export function AdminHeader({ lastUpdated, onRefresh, metrics }) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.custom?.cardBorder || theme.palette.divider}`,
        color: '#F4F7F5',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(120deg, ${theme.palette.primary.dark} 0%, #0B221C 70%)`
          : `linear-gradient(120deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        boxShadow: theme.palette.custom?.cardShadow || theme.shadows[1]
      })}
    >
      <Box
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          background: `radial-gradient(520px 220px at 88% 0%, ${alpha(theme.palette.secondary.light, 0.35)}, transparent 70%)`
        })}
      />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" spacing={1.75} alignItems="flex-start">
          <Avatar
            variant="rounded"
            sx={{
              width: 50,
              height: 50,
              borderRadius: 2.5,
              bgcolor: alpha('#FFFFFF', 0.16),
              color: '#FFFFFF',
              border: `1px solid ${alpha('#FFFFFF', 0.28)}`
            }}
          >
            <TrainIcon />
          </Avatar>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.78, fontWeight: 800, letterSpacing: 1.1 }}>
              SouthRail Console
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.12 }}>
              Admin Management
            </Typography>
            <Typography sx={{ opacity: 0.86, maxWidth: 560, mt: 0.5 }}>
              Operations overview for users, trains, routes, stations, and bookings, built from live API records.
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1.25} alignItems={{ xs: 'flex-start', md: 'flex-end' }} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            sx={{
              bgcolor: '#FFFFFF',
              color: 'primary.dark',
              fontWeight: 800,
              '&:hover': { bgcolor: alpha('#FFFFFF', 0.88) }
            }}
          >
            Refresh data
          </Button>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              icon={<Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#34C38F', ml: '6px' }} />}
              label="Live data"
              sx={{ bgcolor: alpha('#FFFFFF', 0.14), color: '#F4F7F5', fontWeight: 700 }}
            />
            <Chip
              size="small"
              label={`${formatNumber(metrics.totalBookings)} bookings`}
              sx={{ bgcolor: alpha('#FFFFFF', 0.14), color: '#F4F7F5', fontWeight: 700 }}
            />
            {lastUpdated && (
              <Typography variant="caption" sx={{ opacity: 0.78 }}>
                Updated {formatDateTime(lastUpdated)}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ------------------------------- shared atoms ------------------------------- */

function SectionLabel({ icon, title, caption }) {
  return (
    <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mt: 1 }}>
      <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={900}>{title}</Typography>
      {caption && (
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          &middot; {caption}
        </Typography>
      )}
      <Divider sx={{ flexGrow: 1, ml: 1 }} />
    </Stack>
  );
}

export function AdminMetricCard({ label, value, helperText, iconKey, color = 'primary.main', isCurrency = false }) {
  const icon = ICONS[iconKey] || <TimelineIcon />;
  const formatter = isCurrency ? formatCurrency : formatNumber;
  return (
    <Card
      sx={(theme) => ({
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 2.5,
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.palette.mode === 'dark' ? '0 16px 34px rgba(0,0,0,0.36)' : '0 16px 30px rgba(19,35,30,0.12)'
        }
      })}
    >
      <Box sx={{ position: 'absolute', insetBlock: 0, left: 0, width: 4, bgcolor: color }} />
      <CardContent sx={{ p: 2, pl: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption" fontWeight={800} textTransform="uppercase" letterSpacing={0.4}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={950} sx={{ lineHeight: 1.18, mt: 0.25 }}>{formatter(value)}</Typography>
            <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mt: 0.5 }}>{helperText}</Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              flex: '0 0 auto',
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: (theme) => alpha(resolveColor(theme, color), 0.12),
              color
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AdminChartCard({ title, subtitle, children, icon, accent = 'primary', headerExtra }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2.5 }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  flex: '0 0 auto',
                  borderRadius: 1.75,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (theme) => alpha(theme.palette[accent]?.main || theme.palette.primary.main, 0.12),
                  color: `${accent}.main`
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.25 }}>{title}</Typography>
              <Typography color="text.secondary" variant="caption" sx={{ display: 'block' }}>{subtitle}</Typography>
            </Box>
          </Stack>
          {headerExtra}
        </Stack>
        <Divider sx={{ mb: 1.75 }} />
        {children}
      </CardContent>
    </Card>
  );
}

function ChartEmpty({ message = 'Not enough data yet to build this chart.' }) {
  return <EmptyState title="No chart data" message={message} />;
}

export function InsightChip({ label, value, color = 'primary.main' }) {
  return (
    <Paper
      variant="outlined"
      sx={{ px: 1.5, py: 1, borderRadius: 2, minWidth: 0 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{label}</Typography>
      <Typography variant="body2" fontWeight={900} sx={{ color }} noWrap>{value}</Typography>
    </Paper>
  );
}

function HorizontalBarChart({ rows, valueKey, valueFormatter, color }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 0);
  if (!rows.length || !max) return <ChartEmpty />;
  return (
    <Stack spacing={1.4}>
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        const barColor = row.color || color || 'primary.main';
        return (
          <Box key={row.label}>
            <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.6 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800} variant="body2" noWrap>{row.label}</Typography>
                {row.caption && <Typography color="text.secondary" variant="caption" noWrap component="div">{row.caption}</Typography>}
              </Box>
              <Typography fontWeight={850} variant="body2" sx={{ flex: '0 0 auto', pl: 1 }}>{valueFormatter(value)}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(value / max) * 100}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.07),
                '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: barColor }
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

const JOURNEY_STATUS_SEGMENTS = [
  { key: 'confirmed', label: 'Confirmed', color: 'success.main' },
  { key: 'rac', label: 'RAC', color: 'info.main' },
  { key: 'waitlisted', label: 'Waitlisted', color: 'warning.main' },
  { key: 'cancelled', label: 'Cancelled', color: 'error.light' },
  { key: 'failed', label: 'Failed', color: 'error.dark' }
];

function JourneyStatusLegend() {
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
      {JOURNEY_STATUS_SEGMENTS.map((item) => (
        <Chip
          key={item.key}
          size="small"
          label={item.label}
          icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: resolveColor(theme, item.color), ml: '7px' }} />}
          sx={(chipTheme) => ({
            height: 24,
            borderRadius: 99,
            fontWeight: 800,
            bgcolor: alpha(resolveColor(chipTheme, item.color), chipTheme.palette.mode === 'dark' ? 0.18 : 0.11),
            color: 'text.primary',
            '& .MuiChip-icon': { mr: -0.25 }
          })}
        />
      ))}
    </Stack>
  );
}

function JourneyDemandStackedBarChart({ rows, valueFormatter, getTooltip }) {
  const theme = useTheme();
  const max = Math.max(...rows.map((row) => Number(row.totalBookings || row.bookings) || 0), 1);
  const width = 640;
  const height = 220;
  const pad = { top: 28, right: 12, bottom: 52, left: 12 };
  const chartHeight = height - pad.top - pad.bottom;
  const gap = rows.length <= 2 ? 76 : rows.length > 14 ? 7 : 14;
  const rawBarWidth = rows.length ? (width - pad.left - pad.right - gap * (rows.length - 1)) / rows.length : 0;
  const barWidth = Math.max(8, Math.min(rawBarWidth, rows.length <= 2 ? 54 : 42));
  const step = rows.length > 1 ? (width - pad.left - pad.right - barWidth) / (rows.length - 1) : 0;

  if (!rows.length) return <ChartEmpty message="No journey dates available yet." />;

  return (
    <Box sx={{ width: '100%', overflow: 'hidden', pb: 0.5 }}>
      <JourneyStatusLegend />
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Journey demand by date stacked status chart" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {rows.map((row, index) => {
          const total = Number(row.totalBookings || row.bookings) || 0;
          const barHeight = Math.max((total / max) * chartHeight, total ? 4 : 0);
          const x = rows.length === 1 ? (width - barWidth) / 2 : pad.left + index * step;
          const y = height - pad.bottom - barHeight;
          const labelParts = String(row.label).split(' ');
          let segmentY = height - pad.bottom;

          return (
            <g key={row.periodKey || row.label}>
              <title>{getTooltip(row)}</title>
              <text x={x + barWidth / 2} y={Math.max(y - 7, 13)} textAnchor="middle" fontSize="11" fontWeight="900" fill={theme.palette.text.primary}>
                {valueFormatter(total)}
              </text>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="7" fill={alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06)} />
              {JOURNEY_STATUS_SEGMENTS.map((segment, segmentIndex) => {
                const count = Number(row[segment.key]) || 0;
                if (!count || !total) return null;
                const segmentHeight = Math.max((count / total) * barHeight, 1.5);
                segmentY -= segmentHeight;
                return (
                  <rect
                    key={segment.key}
                    x={x}
                    y={segmentY}
                    width={barWidth}
                    height={segmentHeight}
                    rx={segmentIndex === 0 ? 0 : 2}
                    fill={resolveColor(theme, segment.color)}
                  />
                );
              })}
              <text x={x + barWidth / 2} y={height - 34} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={theme.palette.text.secondary}>
                {labelParts.map((part, partIndex) => (
                  <tspan key={`${row.periodKey || row.label}-${part}-${partIndex}`} x={x + barWidth / 2} dy={partIndex ? 10 : 0}>{part}</tspan>
                ))}
              </text>
            </g>
          );
        })}
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
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="center">
      <Box sx={{ width: 168, height: 168, flex: '0 0 auto' }}>
        <svg viewBox="0 0 120 120" role="img" aria-label="Donut chart">
          <circle cx="60" cy="60" r={radius} fill="none" stroke={theme.palette.divider} strokeWidth="15" />
          {validRows.map((row) => {
            const dash = (row.value / total) * circumference;
            const segment = (
              <circle
                key={row.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={resolveColor(theme, row.color)}
                strokeWidth="15"
                strokeLinecap="butt"
                strokeDasharray={`${Math.max(dash - 1.5, 0)} ${circumference - Math.max(dash - 1.5, 0)}`}
                strokeDashoffset={offset}
                pathLength={circumference}
                transform="rotate(-90 60 60)"
              />
            );
            offset -= dash;
            return segment;
          })}
          <text x="60" y="56" textAnchor="middle" fill={theme.palette.text.primary} fontSize="19" fontWeight="800">{formatNumber(total)}</text>
          <text x="60" y="72" textAnchor="middle" fill={theme.palette.text.secondary} fontSize="9.5" fontWeight="600" letterSpacing="0.5">TOTAL</text>
        </svg>
      </Box>
      <Stack spacing={0.9} sx={{ minWidth: 0, width: '100%' }}>
        {validRows.map((row) => <LegendRow key={row.label} row={row} total={total} valueFormatter={valueFormatter} />)}
      </Stack>
    </Stack>
  );
}

function LegendRow({ row, total, valueFormatter }) {
  const theme = useTheme();
  const percent = Math.round((row.value / total) * 100);
  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: resolveColor(theme, row.color), flex: '0 0 auto' }} />
        <Typography variant="body2" fontWeight={750} noWrap>{row.label}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: '0 0 auto', pl: 1 }} noWrap>
        {valueFormatter(row.value)} &middot; {percent}%
      </Typography>
    </Stack>
  );
}

function StatBar({ label, value, total, color }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" fontWeight={750}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{formatNumber(value)} &middot; {percent}%</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 8,
          borderRadius: 99,
          bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.07),
          '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: color }
        }}
      />
    </Box>
  );
}


function journeyStatusSummary(row) {
  return `${formatNumber(row.confirmed)} confirmed · ${formatNumber(row.rac)} RAC · ${formatNumber(row.waitlisted)} waitlisted · ${formatNumber(row.cancelled)} cancelled · ${formatNumber(row.failed)} failed`;
}

function journeyTooltip(row) {
  return [
    row.label,
    `${formatNumber(row.totalBookings || row.bookings)} bookings`,
    `Confirmed: ${formatNumber(row.confirmed)}`,
    `RAC: ${formatNumber(row.rac)}`,
    `Waitlisted: ${formatNumber(row.waitlisted)}`,
    `Cancelled: ${formatNumber(row.cancelled)}`,
    `Failed: ${formatNumber(row.failed)}`,
    `Active fare: ${formatCurrency(row.activeRevenue)}`,
    `Excluded fare: ${formatCurrency(row.excludedFare)}`
  ].join('\n');
}

function riskChipColor(row) {
  if (row.riskRate > 0.5) return 'error';
  if (row.riskRate > 0.25) return 'warning';
  return 'success';
}

function JourneyRevenueRow({ row }) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 1.25,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.42 : 0.72),
        borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08)
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
          <Box>
            <Typography variant="body2" fontWeight={900}>{row.label}</Typography>
            <Typography variant="caption" color="text.secondary">{formatNumber(row.totalBookings || row.bookings)} bookings</Typography>
          </Box>
          <Stack spacing={0.35} alignItems="flex-end">
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Risk level</Typography>
            <Chip
              size="small"
              color={riskChipColor(row)}
              label={`${row.riskLabel} · ${formatNumber(row.riskPercent)}% excluded`}
              sx={{ fontWeight: 850 }}
            />
          </Stack>
        </Stack>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Box sx={(theme) => ({ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.16 : 0.1) })}>
              <Typography variant="caption" color="text.secondary">Active fare</Typography>
              <Typography variant="body2" fontWeight={900} color="success.main">{formatCurrency(row.activeRevenue)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={(theme) => ({ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.18 : 0.12) })}>
              <Typography variant="caption" color="text.secondary">Excluded fare</Typography>
              <Typography variant="body2" fontWeight={900} color="warning.main">{formatCurrency(row.excludedFare)}</Typography>
            </Box>
          </Grid>
        </Grid>

        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>Status summary</Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {journeyStatusSummary(row)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

/* ----------------------------- Journey Trend section ------------------------ */

export function JourneyDateSection({ journeyDateAnalyticsByPeriod }) {
  const [period, setPeriod] = useState('day');
  const analytics = journeyDateAnalyticsByPeriod[period];

  const periodName = {
    day: 'journey date',
    week: 'journey week',
    month: 'journey month',
    year: 'journey year'
  }[period];

  const uniquePeriodLabel = {
    day: 'Unique journey dates',
    week: 'Unique journey weeks',
    month: 'Unique journey months',
    year: 'Unique journey years'
  }[period];

  return (
    <Box>
      <SectionLabel icon={<TrendingUpIcon fontSize="small" />} title="Journey Date Analytics" caption="Grouped by journeyDate, not booking-created time" />
      <Box sx={{ mt: 1.25 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, value) => value && setPeriod(value)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={{ fontWeight: 700, px: 1.5 }}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
  <InsightChip
    label={`Best ${periodName} by revenue`}
    value={analytics.bestByRevenue ? `${analytics.bestByRevenue.label} · ${formatCurrency(analytics.bestByRevenue.activeRevenue)}` : '-'}
    color="success.main"
  />
</Grid>

<Grid item xs={6} sm={3}>
  <InsightChip
    label={`Best ${periodName} by bookings`}
    value={analytics.bestByBookings ? `${analytics.bestByBookings.label} · ${formatNumber(analytics.bestByBookings.bookings)}` : '-'}
    color="primary.main"
  />
</Grid>
          <Grid item xs={6} sm={3}>
            <InsightChip label="Average active fare" value={formatCurrency(analytics.averageActiveFare)} color="info.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <InsightChip
              label={uniquePeriodLabel}
              value={formatNumber(analytics.periods.length)}
              color="secondary.main"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} lg={7}>
            <AdminChartCard
              title="Journey demand by date"
              subtitle="Booking count and status split grouped by journeyDate"
              icon={<TimelineIcon fontSize="small" />}
              accent="primary"
            >
              <JourneyDemandStackedBarChart
                rows={analytics.periods}
                valueFormatter={formatNumber}
                getTooltip={journeyTooltip}
              />
            </AdminChartCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <AdminChartCard
              title="Journey revenue breakdown"
              subtitle="Active fare counted separately from excluded fare"
              icon={<CurrencyRupeeIcon fontSize="small" />}
              accent="success"
            >
              {!analytics.periods.length ? <ChartEmpty message="No journey dates available yet." /> : (
                <Stack spacing={1.1} sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Excluded fare = CANCELLED or FAILED bookings not counted in active revenue
                  </Typography>
                  {[...analytics.periods].sort((a, b) => b.activeRevenue - a.activeRevenue).slice(0, 10).map((row) => (
                    <JourneyRevenueRow key={row.periodKey} row={row} />
                  ))}
                </Stack>
              )}
            </AdminChartCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

/* --------------------------- Train Performance section ---------------------- */

export function TrainPerformanceSection({ trainPerformance }) {
  const { rows, topByActiveRevenue, topByBookingCount, mostCancelled, highestRacWaitlistPressure, trainsWithNoBookings, categoryDistribution } = trainPerformance;

  return (
    <Box>
      <SectionLabel icon={<TrainIcon fontSize="small" />} title="Train Performance Analytics" caption="Revenue, demand, and cancellation risk per train" />
      <Grid container spacing={1.5} sx={{ mt: 0.25, mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Top by active revenue" value={topByActiveRevenue ? `${topByActiveRevenue.trainNumber} · ${formatCurrency(topByActiveRevenue.activeRevenue)}` : '-'} color="success.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Top by bookings" value={topByBookingCount ? `${topByBookingCount.trainNumber} · ${formatNumber(topByBookingCount.totalBookings)}` : '-'} color="primary.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Most cancelled" value={mostCancelled && mostCancelled.cancelled > 0 ? `${mostCancelled.trainNumber} · ${formatNumber(mostCancelled.cancelled)}` : 'None'} color="error.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Highest RAC/WL pressure" value={highestRacWaitlistPressure && highestRacWaitlistPressure.racWaitlistRate > 0 ? `${highestRacWaitlistPressure.trainNumber} · ${highestRacWaitlistPressure.racWaitlistRate.toFixed(0)}%` : 'None'} color="warning.main" />
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <AdminChartCard title="Train scorecard" subtitle="Active revenue, demand, and risk per train" icon={<TrainIcon fontSize="small" />} accent="primary">
            {!rows.length ? <ChartEmpty message="No booking data available for trains yet." /> : (
              <Stack spacing={1.1} sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                {rows.map((row) => (
                  <Paper key={row.trainNumber} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography fontWeight={850} variant="body2" noWrap>{row.trainNumber} &middot; {row.trainName}</Typography>
                          {row.category && <Chip size="small" label={row.category} variant="outlined" />}
                          {row.active !== null && (
                            <Chip size="small" label={row.active ? 'Active' : 'Inactive'} color={row.active ? 'success' : 'default'} variant={row.active ? 'filled' : 'outlined'} />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                          {formatNumber(row.totalBookings)} bookings &middot; {row.cancellationRate.toFixed(1)}% cancelled &middot; {row.racWaitlistRate.toFixed(1)}% RAC/WL
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={900} color="success.main" sx={{ flex: '0 0 auto' }}>{formatCurrency(row.activeRevenue)}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <AdminChartCard title="Category distribution" subtitle="Trains grouped by category" icon={<TrainIcon fontSize="small" />} accent="secondary">
              <HorizontalBarChart rows={categoryDistribution} valueKey="value" valueFormatter={formatNumber} color="secondary.main" />
            </AdminChartCard>
            <AdminChartCard title="Trains with no bookings" subtitle="Configured but unused" icon={<WarningAmberIcon fontSize="small" />} accent="warning">
              {!trainsWithNoBookings.length ? (
                <Typography variant="body2" color="text.secondary">Every configured train has at least one booking.</Typography>
              ) : (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {trainsWithNoBookings.slice(0, 12).map((train) => (
                    <Chip key={train.id || train.number} size="small" variant="outlined" label={train.number} />
                  ))}
                </Stack>
              )}
            </AdminChartCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

/* --------------------------- Route Performance section ---------------------- */

export function RoutePerformanceSection({ routePerformance }) {
  const { rows, isBookingBased, topByBookingCount, topByActiveRevenue, mostCancelled, highestRacWaitlistPressure, routesWithNoBookings } = routePerformance;

  return (
    <Box>
      <SectionLabel
        icon={<AltRouteIcon fontSize="small" />}
        title="Route Performance Analytics"
        caption={isBookingBased ? 'Demand from real booking source/destination pairs' : 'Booking route data unavailable, showing configured coverage'}
      />
      <Grid container spacing={1.5} sx={{ mt: 0.25, mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Top route by bookings" value={topByBookingCount ? `${topByBookingCount.routeLabel} · ${formatNumber(topByBookingCount.totalBookings)}` : '-'} color="primary.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Top route by revenue" value={topByActiveRevenue ? `${topByActiveRevenue.routeLabel} · ${formatCurrency(topByActiveRevenue.activeRevenue)}` : '-'} color="success.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <InsightChip label="Cancellation-heavy route" value={mostCancelled && mostCancelled.cancelled > 0 ? `${mostCancelled.routeLabel} · ${formatNumber(mostCancelled.cancelled)}` : 'None'} color="error.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <InsightChip label="RAC/WL-heavy route" value={highestRacWaitlistPressure && highestRacWaitlistPressure.racWaitlistRate > 0 ? `${highestRacWaitlistPressure.routeLabel} · ${highestRacWaitlistPressure.racWaitlistRate.toFixed(0)}%` : 'None'} color="warning.main" />
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <AdminChartCard
            title={isBookingBased ? 'Route demand' : 'Configured route coverage'}
            subtitle={isBookingBased ? 'Booking count by source \u2192 destination' : 'No booking route data yet'}
            icon={<AltRouteIcon fontSize="small" />}
            accent="secondary"
          >
            <HorizontalBarChart rows={rows} valueKey="totalBookings" valueFormatter={formatNumber} color="secondary.main" />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <AdminChartCard title="Routes with no bookings" subtitle="Configured but no demand yet" icon={<WarningAmberIcon fontSize="small" />} accent="warning">
            {!routesWithNoBookings.length ? (
              <Typography variant="body2" color="text.secondary">All configured routes have at least one booking.</Typography>
            ) : (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {routesWithNoBookings.slice(0, 14).map((route) => (
                  <Chip key={route} size="small" variant="outlined" label={route} />
                ))}
              </Stack>
            )}
          </AdminChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ----------------------------- Status / Risk section ------------------------- */

export function StatusRiskSection({ statusRisk }) {
  const total = statusRisk.total;
  return (
    <Box>
      <SectionLabel icon={<WarningAmberIcon fontSize="small" />} title="Booking Status Risk Analytics" caption="Every status kept separate, RAC and waitlisted are never counted as confirmed" />
      <Grid container spacing={2} alignItems="stretch" sx={{ mt: 0.25 }}>
        <Grid item xs={12} md={7}>
          <AdminChartCard title="Status split" subtitle="Share of each booking status" icon={<ConfirmationNumberIcon fontSize="small" />} accent="primary">
            <Stack spacing={1.5}>
              <StatBar label="Confirmed" value={statusRisk.confirmed} total={total} color="success.main" />
              <StatBar label="RAC" value={statusRisk.rac} total={total} color="info.main" />
              <StatBar label="Waitlisted" value={statusRisk.waitlisted} total={total} color="warning.main" />
              <StatBar label="Cancelled" value={statusRisk.cancelled} total={total} color="error.main" />
              <StatBar label="Failed" value={statusRisk.failed} total={total} color="error.dark" />
              {statusRisk.refunded > 0 && <StatBar label="Refunded" value={statusRisk.refunded} total={total} color="info.dark" />}
              {statusRisk.otherCount > 0 && <StatBar label="Other" value={statusRisk.otherCount} total={total} color="text.disabled" />}
            </Stack>
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <AdminChartCard title="Active vs cancelled/failed fare" subtitle="Cancelled bookings are excluded from active revenue" icon={<CurrencyRupeeIcon fontSize="small" />} accent="success">
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Active revenue</Typography>
                  <Typography variant="body2" fontWeight={900} color="success.main">{formatCurrency(statusRisk.activeFare)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Cancelled/failed amount</Typography>
                  <Typography variant="body2" fontWeight={900} color="error.main">{formatCurrency(statusRisk.cancelledFailedFare)}</Typography>
                </Stack>
              </Stack>
            </AdminChartCard>
            <AdminChartCard title="Risk rates" subtitle="Cancellation and failure rate of all bookings" icon={<WarningAmberIcon fontSize="small" />} accent="error">
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Cancellation rate</Typography>
                  <Typography variant="body2" fontWeight={900}>{statusRisk.cancellationRate.toFixed(1)}%</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Failed rate</Typography>
                  <Typography variant="body2" fontWeight={900}>{statusRisk.failedRate.toFixed(1)}%</Typography>
                </Stack>
              </Stack>
            </AdminChartCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

/* -------------------------------- User Health section ------------------------ */

export function UserHealthSection({ userAnalytics }) {
  // Each group is shown separately on purpose: enabled/disabled, verified/unverified,
  // and admin/normal overlap with each other, so a single combined donut would mislead.
  return (
    <Box>
      <SectionLabel icon={<PeopleAltIcon fontSize="small" />} title="User Analytics" caption="Account health shown as separate, non-overlapping groups" />
      <Grid container spacing={2} alignItems="stretch" sx={{ mt: 0.25 }}>
        <Grid item xs={12} md={4}>
          <AdminChartCard title="Account status" subtitle="Enabled vs disabled" icon={<CheckCircleIcon fontSize="small" />} accent="success">
            <DonutChart
              rows={[
                { label: 'Enabled', value: userAnalytics.enabled, color: 'success.main' },
                { label: 'Disabled', value: userAnalytics.disabled, color: 'text.disabled' }
              ]}
              valueFormatter={formatNumber}
            />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <AdminChartCard title="Email verification" subtitle="Verified vs not verified" icon={<ConfirmationNumberIcon fontSize="small" />} accent="info">
            <DonutChart
              rows={[
                { label: 'Verified', value: userAnalytics.verified, color: 'primary.main' },
                { label: 'Not verified', value: userAnalytics.unverified, color: 'warning.main' }
              ]}
              valueFormatter={formatNumber}
            />
          </AdminChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <AdminChartCard title="Role mix" subtitle="Admin vs non-admin users" icon={<PeopleAltIcon fontSize="small" />} accent="secondary">
            <DonutChart
              rows={[
                { label: 'Admin users', value: userAnalytics.admin, color: 'secondary.main' },
                { label: 'Normal users', value: userAnalytics.normalUsers, color: 'info.main' }
              ]}
              valueFormatter={formatNumber}
            />
          </AdminChartCard>
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Total users: {formatNumber(userAnalytics.total)}
      </Typography>
    </Box>
  );
}

/* ------------------------------ Recent Records section ------------------------ */

export function RecentRecordsSection({ rows }) {
  return (
    <Box>
      <SectionLabel icon={<TimelineIcon fontSize="small" />} title="Recent Reservation Records" caption="Latest journey records, sorted by journey date" />
      <Box sx={{ mt: 1.25 }}>
        <AdminChartCard title="Latest journey records" subtitle="Most recent journeyDate first" icon={<TimelineIcon fontSize="small" />} accent="primary">
          {!rows.length ? <ChartEmpty /> : (
            <Stack spacing={1.1} sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
              {rows.map((row) => (
                <Paper
                  key={row.pnr || `${row.trainNumber}-${row.journeyDate}`}
                  variant="outlined"
                  sx={(theme) => ({
                    p: 1.25,
                    borderRadius: 2,
                    borderLeft: `3px solid ${resolveColor(theme, statusBarColor(row.status))}`,
                    transition: 'background-color 140ms ease',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                  })}
                >
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={850} variant="body2" noWrap>{row.pnr || 'No PNR'} &middot; {row.trainNumber || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">{row.trainName || 'Unknown train'}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {row.sourceCode || '-'} &rarr; {row.destinationCode || '-'} &middot; {formatDate(row.journeyDate)}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5} sx={{ flex: '0 0 auto' }}>
                      <AdminStatusChip label={formatStatus(row.status)} color={getStatusColor(row.status)} />
                      <Typography variant="body2" fontWeight={900}>{formatCurrency(row.totalFare)}</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </AdminChartCard>
      </Box>
    </Box>
  );
}

/* ---------------------------------- Overview -------------------------------- */

export function OverviewTab({ metrics, errors, onRefresh }) {
  const kpis = metrics.kpis;
  const [activeSection, setActiveSection] = useState('journey');

  return (
    <Stack spacing={3}>
      {kpis.length > 0 ? (
        <Grid container spacing={1.75}>
          {kpis.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <AdminMetricCard {...item} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState title="No KPI data available" message="Admin summary data is not available right now." />
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
          value={activeSection}
          onChange={(_, value) => setActiveSection(value)}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ sx: { height: 3, borderRadius: 99 } }}
          sx={{
            minHeight: 42,
            '& .MuiTab-root': {
              minHeight: 42,
              fontWeight: 800,
              borderRadius: 2,
              mx: 0.25,
              textTransform: 'none'
            }
          }}
        >
          {OVERVIEW_SECTION_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {activeSection === 'journey' && (
        <JourneyDateSection journeyDateAnalyticsByPeriod={metrics.journeyDateAnalyticsByPeriod} />
      )}

      {activeSection === 'trains' && (
        <TrainPerformanceSection trainPerformance={metrics.trainPerformance} />
      )}

      {activeSection === 'routes' && (
        <RoutePerformanceSection routePerformance={metrics.routePerformance} />
      )}

      {activeSection === 'risk' && (
        <StatusRiskSection statusRisk={metrics.statusRisk} />
      )}

      {activeSection === 'users' && (
        <UserHealthSection userAnalytics={metrics.userAnalytics} />
      )}

      {activeSection === 'recent' && (
        <RecentRecordsSection rows={metrics.recentBookings} />
      )}

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

/* ------------------------------- Admin data table ---------------------------- */

export function AdminStatusChip({ label, color = 'default' }) {
  return <Chip size="small" label={label} color={color} variant={color === 'default' ? 'outlined' : 'filled'} sx={{ fontWeight: 800 }} />;
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

export function getUserColumns() {
  return [
    { key: 'fullName', header: 'Name', minWidth: 180, render: (row) => row.fullName || '-' },
    { key: 'email', header: 'Email', minWidth: 220, render: (row) => row.email || '-' },
    { key: 'enabled', header: 'Enabled', render: (row) => <BooleanChip value={row.enabled} trueLabel="Enabled" falseLabel="Disabled" /> },
    { key: 'emailVerified', header: 'Email verified', render: (row) => <BooleanChip value={row.emailVerified} trueLabel="Verified" falseLabel="Not verified" /> },
    { key: 'roles', header: 'Roles', minWidth: 180, render: (row) => <RoleList roles={row.roles} /> }
  ];
}

export function getTrainColumns(routeCountByTrain) {
  return [
    { key: 'number', header: 'Train number', render: (row) => row.number || '-' },
    { key: 'name', header: 'Train name', minWidth: 220, render: (row) => row.name || '-' },
    { key: 'category', header: 'Category', render: (row) => row.category || '-' },
    { key: 'active', header: 'Status', render: (row) => <BooleanChip value={row.active} trueLabel="Active" falseLabel="Inactive" /> },
    { key: 'routes', header: 'Route count', render: (row) => formatNumber(routeCountByTrain[row.number] || 0) }
  ];
}

export function getRouteColumns() {
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

export function getStationColumns() {
  return [
    { key: 'code', header: 'Code', render: (row) => row.code || '-' },
    { key: 'name', header: 'Station name', minWidth: 240, render: (row) => row.name || '-' },
    { key: 'city', header: 'City', render: (row) => row.city || '-' },
    { key: 'state', header: 'State', render: (row) => row.state || '-' }
  ];
}

export function getBookingColumns() {
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

export function AdminDataTable({
  title,
  subtitle,
  icon,
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
    <Card sx={{ borderRadius: 2.5 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              {icon && (
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    flex: '0 0 auto',
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main'
                  }}
                >
                  {icon}
                </Box>
              )}
              <Box>
                <Typography variant="h5" fontWeight={900}>{title}</Typography>
                <Typography color="text.secondary" variant="body2">{subtitle}</Typography>
              </Box>
            </Stack>
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
            <>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ width: '100%', overflowX: 'auto', borderRadius: 2 }}
              >
                <Table size="small" aria-label={`${title} table`} sx={{ minWidth: { xs: 680, md: 720 } }}>
                  <TableHead>
                    <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: (theme) => theme.palette.surface?.elevated || theme.palette.background.paper } }}>
                      {columns.map((column) => (
                        <TableCell key={column.key} sx={{ fontWeight: 900, whiteSpace: 'nowrap' }}>
                          {column.header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow
                        key={row.id || row.pnr || JSON.stringify(row)}
                        hover
                        sx={{
                          bgcolor: (theme) => (index % 2 === 1 ? alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.02 : 0.015) : 'transparent')
                        }}
                      >
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
              <Typography variant="caption" color="text.secondary">
                Showing {formatNumber(rows.length)} {rows.length === 1 ? 'record' : 'records'}
              </Typography>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}