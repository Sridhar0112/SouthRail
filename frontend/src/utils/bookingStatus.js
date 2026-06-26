export function normalizeBookingStatus(status) {
  return String(status || '').trim().toUpperCase();
}

export function safeText(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹ -';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function getBookingStatusLabel(status, reservationLabel) {
  const value = normalizeBookingStatus(status);
  if (reservationLabel) return String(reservationLabel).trim();
  if (value === 'CONFIRMED') return 'CNF';
  if (value === 'WAITLISTED') return 'WL';
  return value || 'UNKNOWN';
}

export function getBookingStatusTitle(status) {
  const value = normalizeBookingStatus(status);
  if (value === 'CONFIRMED') return 'Booking confirmed';
  if (value === 'RAC') return 'Booking placed in RAC';
  if (value === 'WAITLISTED') return 'Booking waitlisted';
  if (value === 'CANCELLED') return 'Booking cancelled';
  return 'Booking created';
}

export function getBookingStatusMessage(status) {
  const value = normalizeBookingStatus(status);
  if (value === 'CONFIRMED') return 'Your ticket is confirmed.';
  if (value === 'RAC') return 'Your booking is in RAC. Final berth confirmation depends on cancellations and chart preparation.';
  if (value === 'WAITLISTED') return 'Your booking is waitlisted. Please track PNR status before travel.';
  if (value === 'CANCELLED') return 'This booking has been cancelled.';
  return 'Please check PNR status before travel.';
}

export function getBookingStatusColor(status) {
  const value = normalizeBookingStatus(status);
  if (value === 'CONFIRMED' || value === 'BOOKED') return 'success';
  if (value === 'RAC') return 'info';
  if (value === 'WAITLISTED' || value === 'WL' || value === 'PENDING') return 'warning';
  if (value === 'CANCELLED' || value === 'FAILED') return 'error';
  if (value === 'REFUNDED') return 'info';
  return 'default';
}

export function getQueueText(queuePosition) {
  const position = Number(queuePosition);
  return Number.isFinite(position) && position > 0 ? String(position) : '-';
}
