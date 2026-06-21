import api from './api';

export async function downloadTicketPdf(pnr) {
  const safePnr = String(pnr || '').trim();
  if (!safePnr) {
    throw new Error('PNR is required to download ticket.');
  }

  const response = await api.get(`/bookings/${encodeURIComponent(safePnr)}/ticket`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', `SouthRail-Ticket-${safePnr.replace(/[^a-z0-9-]/gi, '')}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
