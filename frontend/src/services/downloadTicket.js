import api from './api'

export async function downloadTicketPdf(pnr) {
  if (!pnr) {
    throw new Error('PNR is required to download ticket.');
  }

  const response = await api.get(`/bookings/${pnr}/ticket`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/pdf'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', `SouthRail-Ticket-${pnr}.pdf`);
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}