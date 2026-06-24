import { Link } from 'react-router-dom';
import { Button, Chip, Tooltip } from '@mui/material';
import { formatDuration, formatFare, formatTime, getAvailabilityStatus, getToday } from '../../searchUtils.js';

export default function SearchResultRow({ train, search }) {
  const availability = getAvailabilityStatus(train);
  const canBook = availability.canBook;
  const bookingParams = new URLSearchParams({
    sourceStationCode: train.sourceCode || search?.source || '',
    destinationStationCode: train.destinationCode || search?.destination || '',
    journeyDate: search?.journeyDate || getToday(),
    travelClass: search?.travelClass || '3A',
    quota: search?.quota || 'GENERAL'
  });

  return (
    <article className={`sr-result-row ${canBook ? '' : 'sr-result-row--disabled'}`}>
      <div className="sr-result-train"><strong>{train.trainName || 'Train'}</strong><span>{train.trainNumber || '-'} · {search?.travelClass || '3A'} · {search?.quota || 'GENERAL'}</span></div>
      <div className="sr-result-route"><b>{formatTime(train.departureTime)}</b><span>{train.sourceCode || search?.source}</span><i aria-hidden="true" /><small>{formatDuration(train.durationMinutes)}</small><i aria-hidden="true" /><b>{formatTime(train.arrivalTime)}</b><span>{train.destinationCode || search?.destination}</span></div>
      <div className="sr-result-action">
        <Chip size="small" color={availability.color} label={availability.label} />
        <strong>{formatFare(train.fare)}</strong>
        <Tooltip title={canBook ? '' : 'Booking is unavailable for this train and class.'}>
          <span><Button component={canBook ? Link : 'button'} to={canBook ? `/booking/${train.trainId}?${bookingParams.toString()}` : undefined} disabled={!canBook} variant="contained">{canBook ? 'Reserve seat' : availability.detail}</Button></span>
        </Tooltip>
      </div>
    </article>
  );
}
