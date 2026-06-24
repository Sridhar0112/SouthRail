import { Autocomplete, TextField } from '@mui/material';

const classes = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const quotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];

export const popularRoutes = [
  { from: 'MS', to: 'MDU', name: 'Chennai Egmore → Madurai', fastest: '7h 45m', demand: 'High' },
  { from: 'MAS', to: 'CBE', name: 'Chennai Central → Coimbatore', fastest: '6h 50m', demand: 'Peak' },
  { from: 'ERS', to: 'TVC', name: 'Ernakulam → Trivandrum', fastest: '4h 20m', demand: 'Open' },
  { from: 'TPJ', to: 'TEN', name: 'Tiruchirappalli → Tirunelveli', fastest: '5h 35m', demand: 'Limited' },
];

export function BookingSearchPanel({ searchProps, compact = false }) {
  const p = searchProps;
  return <div className={`sr-booking-panel ${compact ? 'sr-booking-panel--compact' : ''}`}>
    <div className="sr-command-header"><div><span>RESERVATION SEARCH</span><h2>Book a train</h2></div><strong>{p.trains.loading ? 'CHECKING' : 'LIVE INVENTORY'}</strong></div>
    <form onSubmit={p.handleSubmit(p.onSubmit, p.onInvalid)} className="sr-console-form">
      <input type="hidden" {...p.register('source', { required: 'Source station is required' })} /><input type="hidden" {...p.register('destination', { required: 'Destination station is required' })} />
      <StationAutocomplete label="FROM" value={p.selectedSource} inputValue={p.sourceInput} options={p.sourceOptions} loading={p.sourceLoading} onInput={p.onSourceInput} onClear={p.onSourceClear} onChange={p.onSourceChange} error={!!p.errors.source} helperText={p.errors.source?.message} />
      <button className="sr-swap-control" type="button" onClick={p.swap} aria-label="Swap stations">⇄</button>
      <StationAutocomplete label="TO" value={p.selectedDestination} inputValue={p.destinationInput} options={p.destinationOptions} loading={p.destinationLoading} onInput={p.onDestinationInput} onClear={p.onDestinationClear} onChange={p.onDestinationChange} error={!!p.errors.destination} helperText={p.errors.destination?.message} />
      <TextField type="date" label="DATE" InputLabelProps={{ shrink: true }} inputProps={{ min: p.today }} error={!!p.errors.journeyDate} helperText={p.errors.journeyDate?.message} {...p.register('journeyDate', { required: 'Journey date is required', validate: (value) => value >= p.today || 'Please select today or a future journey date.' })} />
      <TextField select SelectProps={{ native: true }} label="CLASS" {...p.register('travelClass', { required: true })}>{classes.map((item) => <option key={item} value={item}>{item}</option>)}</TextField>
      <TextField select SelectProps={{ native: true }} label="QUOTA" {...p.register('quota', { required: true })}>{quotas.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</TextField>
      <button className="sr-command-submit" disabled={p.trains.loading}>{p.trains.loading ? 'Checking...' : 'Search trains'}</button>
    </form>
    <div className="sr-live-route"><span>{p.sourceInput || 'SOURCE'}</span><i /><span>{p.destinationInput || 'DESTINATION'}</span></div>
    {(p.sourceError || p.destinationError) && <p className="sr-console-warning">{p.sourceError || p.destinationError}</p>}
  </div>;
}

export default function SearchCommandCenter({ searchProps, hasSearchAttempt }) {
  return <section className={`sr-command-section ${hasSearchAttempt ? 'sr-command-section--searched' : ''}`}><BookingSearchPanel searchProps={searchProps} /></section>;
}
function StationAutocomplete({ label, value, inputValue, options, loading, onInput, onClear, onChange, error, helperText }) { return <Autocomplete className="sr-station-auto" value={value} inputValue={inputValue} options={options} loading={loading} filterOptions={(items) => items} getOptionLabel={(option) => option?.name ? `${option.code} - ${option.name}` : option?.code || ''} isOptionEqualToValue={(option, selected) => option?.code === selected?.code} onInputChange={(_, nextValue, reason) => { if (reason === 'input') onInput(nextValue); if (reason === 'clear') onClear(); }} onChange={(_, option) => onChange(option)} renderInput={(params) => <TextField {...params} label={label} error={error} helperText={helperText} />} />; }
