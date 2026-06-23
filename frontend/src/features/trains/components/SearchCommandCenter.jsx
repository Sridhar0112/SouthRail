import { Autocomplete, TextField } from '@mui/material';
import { motion } from 'framer-motion';

const classes = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const quotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];
const shortcuts = [['MS', 'MDU'], ['MAS', 'CBE'], ['ERS', 'TVC'], ['TPJ', 'TEN']];

export default function SearchCommandCenter({ searchProps, hasSearchAttempt }) {
  const p = searchProps;
  return <section className={`sr-command-section ${hasSearchAttempt ? 'sr-command-section--searched' : ''}`}><motion.div className="sr-command-center" initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
    <div className="sr-command-header"><div><span>OPERATIONS COMMAND</span><h2>Find your next southern corridor</h2></div><strong>{p.trains.loading ? 'SCANNING' : 'LIVE'}</strong></div>
    <form onSubmit={p.handleSubmit(p.onSubmit, p.onInvalid)} className="sr-console-form">
      <input type="hidden" {...p.register('source', { required: 'Source station is required' })} /><input type="hidden" {...p.register('destination', { required: 'Destination station is required' })} />
      <StationAutocomplete label="FROM STATION" value={p.selectedSource} inputValue={p.sourceInput} options={p.sourceOptions} loading={p.sourceLoading} onInput={p.onSourceInput} onClear={p.onSourceClear} onChange={p.onSourceChange} error={!!p.errors.source} helperText={p.errors.source?.message} />
      <button className="sr-swap-control" type="button" onClick={p.swap} aria-label="Swap stations">⇄</button>
      <StationAutocomplete label="TO STATION" value={p.selectedDestination} inputValue={p.destinationInput} options={p.destinationOptions} loading={p.destinationLoading} onInput={p.onDestinationInput} onClear={p.onDestinationClear} onChange={p.onDestinationChange} error={!!p.errors.destination} helperText={p.errors.destination?.message} />
      <TextField type="date" label="DATE" InputLabelProps={{ shrink: true }} inputProps={{ min: p.today }} error={!!p.errors.journeyDate} helperText={p.errors.journeyDate?.message} {...p.register('journeyDate', { required: 'Journey date is required', validate: (value) => value >= p.today || 'Please select today or a future journey date.' })} />
      <TextField select SelectProps={{ native: true }} label="CLASS" {...p.register('travelClass', { required: true })}>{classes.map((item) => <option key={item} value={item}>{item}</option>)}</TextField>
      <TextField select SelectProps={{ native: true }} label="QUOTA" {...p.register('quota', { required: true })}>{quotas.map((item) => <option key={item} value={item}>{item}</option>)}</TextField>
      <button className="sr-command-submit" disabled={p.trains.loading}>{p.trains.loading ? 'Searching network...' : 'Search trains'}</button>
    </form>
    <div className="sr-live-route"><span>{p.sourceInput || 'SOURCE'}</span><i /><span>{p.destinationInput || 'DESTINATION'}</span></div>
    <div className="sr-shortcuts"><small>Popular corridors</small>{shortcuts.map(([from, to]) => <button key={`${from}-${to}`} type="button" onClick={() => p.applyRecentSearch({ source: from, destination: to, journeyDate: p.today, travelClass: '3A', quota: 'GENERAL' })}>{from} → {to}</button>)}</div>
    {(p.sourceError || p.destinationError) && <p className="sr-console-warning">{p.sourceError || p.destinationError}</p>}
  </motion.div></section>;
}
function StationAutocomplete({ label, value, inputValue, options, loading, onInput, onClear, onChange, error, helperText }) { return <Autocomplete className="sr-station-auto" value={value} inputValue={inputValue} options={options} loading={loading} filterOptions={(items) => items} getOptionLabel={(option) => option?.name ? `${option.code} - ${option.name}` : option?.code || ''} isOptionEqualToValue={(option, selected) => option?.code === selected?.code} onInputChange={(_, nextValue, reason) => { if (reason === 'input') onInput(nextValue); if (reason === 'clear') onClear(); }} onChange={(_, option) => onChange(option)} renderInput={(params) => <TextField {...params} label={label} error={error} helperText={helperText} />} />; }
