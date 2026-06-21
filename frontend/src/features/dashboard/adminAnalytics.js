// Pure data-aggregation helpers for the Admin Dashboard.
// No JSX here — these functions take raw API rows and return plain
// objects/arrays that the UI layer (AdminDashboardSections.jsx) renders.
//
// IMPORTANT: bookings only expose `journeyDate`, not a booking-created
// timestamp. All "trend" / "by date" analytics below are therefore grouped
// by journeyDate. Nothing here invents createdAt, booking time, or hourly
// data — none of that exists in the API response.

import api from '../../services/api.js';
import { normalizeDateKey, normalizeStatus } from './adminFormatters.js';

export const pageSize = 100;

export const initialFilters = {
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

export function emptyAdminData() {
  return {
    summary: null,
    users: [],
    trains: [],
    routes: [],
    stations: [],
    bookings: []
  };
}

export async function fetchPagedRows(endpoint) {
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

/* ---------------------------- generic helpers ---------------------------- */

export function countBy(rows, getKey) {
  return rows.reduce((counts, row) => {
    const key = getKey(row);
    if (!key) {
      return counts;
    }
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function topGroups(rows, getKey, makeRow, limit = 5) {
  const counts = countBy(rows, getKey);
  return Object.entries(counts)
    .map(([key, value]) => makeRow(key, value, rows.find((row) => getKey(row) === key)))
    .sort((a, b) => b.value - a.value || compareText(a.label, b.label))
    .slice(0, limit);
}

export function sumBy(rows, getValue) {
  return rows.reduce((sum, row) => sum + getValue(row), 0);
}

export function unique(values) {
  return Array.from(new Set(values));
}

export function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

export function compareDateDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

export function matchesSearch(row, fields, query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return fields.some((field) => String(row[field] || '').toLowerCase().includes(normalized));
}

export function parseFare(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

// Active revenue rule: exclude CANCELLED and FAILED. Everything else
// (CONFIRMED, RAC, WAITLISTED/WAITLIST, REFUNDED, any other backend status)
// counts toward active revenue.
export function isRevenueBooking(status) {
  const value = normalizeStatus(status);
  return !['CANCELLED', 'FAILED', 'REFUNDED'].includes(value);
}

export function hasRole(roles, role) {
  const list = Array.isArray(roles) ? roles : Array.from(roles || []);
  return list.some((item) => String(item).toUpperCase().includes(role));
}

export function trainKey(row) {
  return [row.trainNumber, row.trainName].filter(Boolean).join(' · ') || 'Unknown train';
}

export function routeKey(row) {
  return row.sourceCode && row.destinationCode ? `${row.sourceCode} → ${row.destinationCode}` : '';
}

/* --------------------------- journeyDate periods -------------------------- */

// Period key derived purely from journeyDate — never from booking time.
export function journeyPeriodKey(journeyDate, period) {
  const dateKey = normalizeDateKey(journeyDate);
  if (!dateKey) return '';
  if (period === 'day') return dateKey;

  const date = new Date(`${dateKey}T00:00:00`);

  if (period === 'week') {
    const day = date.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - diffToMonday);
    return toLocalDateKey(monday);
  }

  if (period === 'month') {
    return dateKey.slice(0, 7); // YYYY-MM
  }

  if (period === 'year') {
    return dateKey.slice(0, 4); // YYYY
  }

  return dateKey;
}
function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatPeriodLabel(periodKey, period) {
  if (!periodKey) return '-';
  if (period === 'day' || period === 'week') {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(`${periodKey}T00:00:00`));
  }
  if (period === 'month') {
    const [year, month] = periodKey.split('-');
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
  }
  return periodKey; // year
}

/**
 * Builds journey-date analytics (day / week / month / year) purely from
 * `journeyDate` on each booking. No createdAt, no booking time, no fake
 * dates — periods with zero journeys simply don't appear.
 */
export function buildJourneyDateAnalytics(bookings, period) {
  const validFareBookings = bookings
    .map((row) => ({ ...row, parsedFare: parseFare(row.totalFare) }))
    .filter((row) => row.parsedFare !== null && normalizeDateKey(row.journeyDate));

  const grouped = validFareBookings.reduce((acc, row) => {
    const key = journeyPeriodKey(row.journeyDate, period);
    if (!key) return acc;
    if (!acc[key]) {
      acc[key] = {
        periodKey: key,
        label: formatPeriodLabel(key, period),
        bookings: 0,
        activeRevenue: 0,
        grossRevenue: 0,
        cancelledFailedAmount: 0,
        confirmed: 0,
        rac: 0,
        waitlisted: 0,
        cancelled: 0,
        failed: 0
      };
    }
    const bucket = acc[key];
    const status = normalizeStatus(row.status);
    bucket.bookings += 1;
    bucket.grossRevenue += row.parsedFare;

    if (isRevenueBooking(status)) {
      bucket.activeRevenue += row.parsedFare;
    } else {
      bucket.cancelledFailedAmount += row.parsedFare;
    }

    if (status === 'CONFIRMED' || status === 'BOOKED') bucket.confirmed += 1;
    else if (status === 'RAC') bucket.rac += 1;
    else if (status === 'WAITLISTED' || status === 'WAITLIST') bucket.waitlisted += 1;
    else if (status === 'CANCELLED') bucket.cancelled += 1;
    else if (status === 'FAILED') bucket.failed += 1;

    return acc;
  }, {});

  const periods = Object.values(grouped).sort((a, b) => compareText(a.periodKey, b.periodKey));

  const bestByRevenue = periods.length
    ? periods.reduce((best, row) => (row.activeRevenue > best.activeRevenue ? row : best))
    : null;
  const bestByBookings = periods.length
    ? periods.reduce((best, row) => (row.bookings > best.bookings ? row : best))
    : null;

  const totalActiveFareBookings = validFareBookings.filter((row) => isRevenueBooking(row.status));
  const averageActiveFare = totalActiveFareBookings.length
    ? sumBy(totalActiveFareBookings, (row) => row.parsedFare) / totalActiveFareBookings.length
    : 0;

  return {
    period,
    periods,
    bestByRevenue,
    bestByBookings,
    averageActiveFare,
    totalUniqueJourneyDates: unique(validFareBookings.map((row) => normalizeDateKey(row.journeyDate))).length
  };
}

/* ------------------------------ train analytics --------------------------- */

export function buildTrainPerformance(bookings, trains) {
  const trainInfoByNumber = trains.reduce((acc, train) => {
    if (train.number) acc[train.number] = train;
    return acc;
  }, {});

  const validFareBookings = bookings
    .map((row) => ({ ...row, parsedFare: parseFare(row.totalFare) }))
    .filter((row) => row.parsedFare !== null);

  const grouped = validFareBookings.reduce((acc, row) => {
    const key = row.trainNumber || 'Unknown train';
    if (!acc[key]) {
      const info = trainInfoByNumber[row.trainNumber];
      acc[key] = {
        trainNumber: row.trainNumber || '-',
        trainName: row.trainName || info?.name || 'Unknown train',
        category: info?.category || null,
        active: typeof info?.active === 'boolean' ? info.active : null,
        totalBookings: 0,
        activeRevenue: 0,
        grossRevenue: 0,
        confirmed: 0,
        rac: 0,
        waitlisted: 0,
        cancelled: 0,
        failed: 0
      };
    }
    const bucket = acc[key];
    const status = normalizeStatus(row.status);
    bucket.totalBookings += 1;
    bucket.grossRevenue += row.parsedFare;
    if (isRevenueBooking(status)) bucket.activeRevenue += row.parsedFare;

    if (status === 'CONFIRMED' || status === 'BOOKED') bucket.confirmed += 1;
    else if (status === 'RAC') bucket.rac += 1;
    else if (status === 'WAITLISTED' || status === 'WAITLIST') bucket.waitlisted += 1;
    else if (status === 'CANCELLED') bucket.cancelled += 1;
    else if (status === 'FAILED') bucket.failed += 1;

    return acc;
  }, {});

  const rows = Object.values(grouped).map((row) => ({
    ...row,
    cancellationRate: row.totalBookings ? (row.cancelled / row.totalBookings) * 100 : 0,
    racWaitlistRate: row.totalBookings ? ((row.rac + row.waitlisted) / row.totalBookings) * 100 : 0
  }));

  rows.sort((a, b) => b.activeRevenue - a.activeRevenue);

  const bookedTrainNumbers = new Set(rows.map((row) => row.trainNumber));
  const trainsWithNoBookings = trains.filter((train) => !bookedTrainNumbers.has(train.number));

  const categoryCounts = countBy(trains, (row) => row.category || '');

  return {
    rows,
    topByActiveRevenue: rows.length ? [...rows].sort((a, b) => b.activeRevenue - a.activeRevenue)[0] : null,
    topByBookingCount: rows.length ? [...rows].sort((a, b) => b.totalBookings - a.totalBookings)[0] : null,
    mostCancelled: rows.length ? [...rows].sort((a, b) => b.cancelled - a.cancelled)[0] : null,
    highestRacWaitlistPressure: rows.length ? [...rows].sort((a, b) => b.racWaitlistRate - a.racWaitlistRate)[0] : null,
    trainsWithNoBookings,
    categoryDistribution: Object.entries(categoryCounts)
      .filter(([key]) => key)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  };
}

/* ------------------------------ route analytics ---------------------------- */

export function buildRoutePerformance(bookings, routes) {
  const validFareBookings = bookings
    .map((row) => ({ ...row, parsedFare: parseFare(row.totalFare) }))
    .filter((row) => row.parsedFare !== null && routeKey(row));

  const grouped = validFareBookings.reduce((acc, row) => {
    const key = routeKey(row);
    if (!acc[key]) {
      acc[key] = {
        routeLabel: key,
        sourceCode: row.sourceCode,
        destinationCode: row.destinationCode,
        totalBookings: 0,
        activeRevenue: 0,
        grossRevenue: 0,
        confirmed: 0,
        rac: 0,
        waitlisted: 0,
        cancelled: 0,
        failed: 0
      };
    }
    const bucket = acc[key];
    const status = normalizeStatus(row.status);
    bucket.totalBookings += 1;
    bucket.grossRevenue += row.parsedFare;
    if (isRevenueBooking(status)) bucket.activeRevenue += row.parsedFare;

    if (status === 'CONFIRMED' || status === 'BOOKED') bucket.confirmed += 1;
    else if (status === 'RAC') bucket.rac += 1;
    else if (status === 'WAITLISTED' || status === 'WAITLIST') bucket.waitlisted += 1;
    else if (status === 'CANCELLED') bucket.cancelled += 1;
    else if (status === 'FAILED') bucket.failed += 1;

    return acc;
  }, {});

  const demandRows = Object.values(grouped).map((row) => ({
    ...row,
    cancellationRate: row.totalBookings ? (row.cancelled / row.totalBookings) * 100 : 0,
    racWaitlistRate: row.totalBookings ? ((row.rac + row.waitlisted) / row.totalBookings) * 100 : 0
  }));

  const isBookingBased = demandRows.length > 0;
  const configuredRouteKeys = unique(routes.map((row) => routeKey(row)).filter(Boolean));
  const bookedRouteKeys = new Set(demandRows.map((row) => row.routeLabel));
  const routesWithNoBookings = configuredRouteKeys.filter((key) => !bookedRouteKeys.has(key));

  const fallbackRows = isBookingBased
    ? []
    : topGroups(routes, (row) => routeKey(row), (key, value) => ({ routeLabel: key, totalBookings: value }), 8);

  return {
    isBookingBased,
    rows: isBookingBased ? demandRows.sort((a, b) => b.totalBookings - a.totalBookings) : fallbackRows,
    topByBookingCount: demandRows.length ? [...demandRows].sort((a, b) => b.totalBookings - a.totalBookings)[0] : null,
    topByActiveRevenue: demandRows.length ? [...demandRows].sort((a, b) => b.activeRevenue - a.activeRevenue)[0] : null,
    mostCancelled: demandRows.length ? [...demandRows].sort((a, b) => b.cancelled - a.cancelled)[0] : null,
    highestRacWaitlistPressure: demandRows.length ? [...demandRows].sort((a, b) => b.racWaitlistRate - a.racWaitlistRate)[0] : null,
    routesWithNoBookings
  };
}

/* ------------------------------ status / risk ------------------------------ */

export function buildStatusRiskAnalytics(bookings) {
  const statusCounts = countBy(bookings, (row) => normalizeStatus(row.status));
  const total = bookings.length;

  const validFareBookings = bookings
    .map((row) => ({ ...row, parsedFare: parseFare(row.totalFare) }))
    .filter((row) => row.parsedFare !== null);

  const activeFare = sumBy(validFareBookings.filter((row) => isRevenueBooking(row.status)), (row) => row.parsedFare);
  const cancelledFailedFare = sumBy(validFareBookings.filter((row) => !isRevenueBooking(row.status)), (row) => row.parsedFare);

  const confirmed = (statusCounts.CONFIRMED || 0) + (statusCounts.BOOKED || 0);
  const rac = statusCounts.RAC || 0;
  const waitlisted = (statusCounts.WAITLISTED || 0) + (statusCounts.WAITLIST || 0);
  const cancelled = statusCounts.CANCELLED || 0;
  const failed = statusCounts.FAILED || 0;
  const refunded = statusCounts.REFUNDED || 0;

  const knownKeys = new Set(['CONFIRMED', 'BOOKED', 'RAC', 'WAITLISTED', 'WAITLIST', 'CANCELLED', 'FAILED', 'REFUNDED']);
  const otherCount = Object.entries(statusCounts)
    .filter(([key]) => key && !knownKeys.has(key))
    .reduce((sum, [, value]) => sum + value, 0);

  const rate = (value) => (total ? (value / total) * 100 : 0);

  return {
    total,
    statusCounts,
    confirmed,
    rac,
    waitlisted,
    cancelled,
    failed,
    refunded,
    otherCount,
    confirmedRate: rate(confirmed),
    racRate: rate(rac),
    waitlistRate: rate(waitlisted),
    cancellationRate: rate(cancelled),
    failedRate: rate(failed),
    activeCount: confirmed + rac + waitlisted + refunded + otherCount,
    cancelledOrFailedCount: cancelled + failed,
    activeFare,
    cancelledFailedFare
  };
}

/* -------------------------------- user health ------------------------------ */

// Each group below is reported on its own — never merged into a single donut,
// since "enabled", "verified" and "admin" groups overlap with each other.
export function buildUserAnalytics(users) {
  const enabled = users.filter((row) => row.enabled).length;
  const disabled = users.length - enabled;
  const verified = users.filter((row) => row.emailVerified).length;
  const unverified = users.length - verified;
  const admin = users.filter((row) => hasRole(row.roles, 'ADMIN')).length;
  const normalUsers = users.length - admin;

  return {
    total: users.length,
    enabled,
    disabled,
    verified,
    unverified,
    admin,
    normalUsers
  };
}

/* ------------------------------- top-level build ---------------------------- */

export function buildAdminMetrics(data) {
  const bookingStatusCounts = countBy(data.bookings, (row) => normalizeStatus(row.status));
  const routeCountByTrain = countBy(data.routes, (row) => row.trainNumber || 'Unknown train');
  const validFareBookings = data.bookings.map((row) => ({ ...row, parsedFare: parseFare(row.totalFare) })).filter((row) => row.parsedFare !== null);
  const activeFareBookings = validFareBookings.filter((row) => isRevenueBooking(row.status));
  const grossRevenue = sumBy(validFareBookings, (row) => row.parsedFare);
  const activeRevenue = sumBy(activeFareBookings, (row) => row.parsedFare);

  const trainActiveCount = data.trains.filter((row) => row.active).length;
  const trainInactiveCount = data.trains.length - trainActiveCount;

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

    // Recent reservation records: sorted by journeyDate (no createdAt exists).
    recentBookings: [...data.bookings].sort((a, b) => compareDateDesc(a.journeyDate, b.journeyDate)).slice(0, 8),

    bookingStatusRows: Object.entries(bookingStatusCounts).map(([label, value]) => ({
      label,
      value
    })).sort((a, b) => b.value - a.value),

    journeyDateAnalyticsByPeriod: {
      day: buildJourneyDateAnalytics(data.bookings, 'day'),
      week: buildJourneyDateAnalytics(data.bookings, 'week'),
      month: buildJourneyDateAnalytics(data.bookings, 'month'),
      year: buildJourneyDateAnalytics(data.bookings, 'year')
    },

    trainPerformance: buildTrainPerformance(data.bookings, data.trains),
    routePerformance: buildRoutePerformance(data.bookings, data.routes),
    statusRisk: buildStatusRiskAnalytics(data.bookings),
    userAnalytics: buildUserAnalytics(data.users),

    averageRoutesPerTrain: data.trains.length ? data.routes.length / data.trains.length : 0,
    stationDistribution: topGroups(data.stations, (row) => row.state || row.city || '', (key, value) => ({ label: key, value }), 8)
  };
}

// Convenience wrapper: builds metrics and attaches the KPI list in one call,
// since the Overview UI only ever needs both together.
export function buildAdminMetricsWithKpis(data) {
  const metrics = buildAdminMetrics(data);
  return { ...metrics, kpis: buildKpis(data, metrics) };
}

export function buildKpis(data, metrics) {
  return [
    { value: metrics.activeRevenue, label: 'Active Revenue', helperText: `Gross Rs ${formatGrossHint(metrics.grossRevenue)}`, iconKey: 'currency', color: 'success.main', isCurrency: true },
    { value: metrics.totalBookings || data.summary?.bookings || 0, label: 'Total Bookings', helperText: 'All reservation records', iconKey: 'ticket', color: 'primary.main' },
    { value: metrics.confirmedBookings, label: 'Confirmed Bookings', helperText: 'Confirmed reservations', iconKey: 'check', color: 'success.main' },
    { value: metrics.racBookings, label: 'RAC Bookings', helperText: 'Reservation against cancellation', iconKey: 'timeline', color: 'info.main' },
    { value: metrics.waitlistedBookings, label: 'Waitlisted Bookings', helperText: 'Waiting list reservations', iconKey: 'ticket', color: 'warning.main' },
    { value: metrics.cancelledBookings, label: 'Cancelled Bookings', helperText: `${metrics.cancellationRate.toFixed(1)}% cancellation rate`, iconKey: 'cancel', color: 'error.main' },
    { value: metrics.activeTrains, label: 'Active Trains', helperText: `${metrics.activeTrains + metrics.inactiveTrains} configured trains`, iconKey: 'train', color: 'success.main' },
    { value: data.users.length || data.summary?.users || 0, label: 'Total Users', helperText: 'Registered accounts', iconKey: 'people', color: 'primary.main' }
  ];
}

function formatGrossHint(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
}

export function buildFilteredTables(data, filters, metrics) {
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
    .sort((a, b) => compareDateDesc(a.journeyDate, b.journeyDate));

  return { users, trains, routes, stations, bookings, routeCountByTrain: metrics.routeCountByTrain };
}