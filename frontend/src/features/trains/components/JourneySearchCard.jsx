import { Autocomplete, Alert, Box, Button, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const classes = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const quotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];

export default function JourneySearchCard({ compact = false, today, register, handleSubmit, onSubmit, onInvalid, errors, trains, selectedSource, selectedDestination, sourceInput, destinationInput, sourceOptions, destinationOptions, sourceLoading, destinationLoading, sourceError, destinationError, onSourceInput, onSourceClear, onSourceChange, onDestinationInput, onDestinationClear, onDestinationChange, recentSearches, applyRecentSearch, swap }) {
  return (
    <Paper className="sr-search-card" elevation={0}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} className="sr-search-head">
        <Box><Typography variant="overline">Plan your journey</Typography><Typography variant={compact ? 'h5' : 'h4'}>Find your SouthRail train</Typography></Box>
        <Box className="sr-booking-badge"><ConfirmationNumberIcon fontSize="small" /></Box>
      </Stack>
      <Box component="form" onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <input type="hidden" {...register('source', { required: 'Source station is required' })} />
        <input type="hidden" {...register('destination', { required: 'Destination station is required' })} />
        <Grid container spacing={compact ? 1.5 : 1.75} alignItems="center">
          <Grid item xs={12} sm={compact ? 3 : 5.35}><StationAutocomplete label="From" icon={<MyLocationIcon />} value={selectedSource} inputValue={sourceInput} options={sourceOptions} loading={sourceLoading} onInput={onSourceInput} onClear={onSourceClear} onChange={onSourceChange} error={!!errors.source} helperText={errors.source?.message} /></Grid>
          <Grid item xs={12} sm={compact ? 1 : 1.3} className="sr-swap-cell"><Button className="sr-swap-button" type="button" onClick={swap} aria-label="Swap stations"><SwapHorizIcon /></Button></Grid>
          <Grid item xs={12} sm={compact ? 3 : 5.35}><StationAutocomplete label="To" icon={<LocationOnIcon />} value={selectedDestination} inputValue={destinationInput} options={destinationOptions} loading={destinationLoading} onInput={onDestinationInput} onClear={onDestinationClear} onChange={onDestinationChange} error={!!errors.destination} helperText={errors.destination?.message} /></Grid>
          <Grid item xs={12} sm={compact ? 2 : 4}><TextField fullWidth type="date" label="Journey date" InputLabelProps={{ shrink: true }} inputProps={{ min: today }} error={!!errors.journeyDate} helperText={errors.journeyDate?.message} {...register('journeyDate', { required: 'Journey date is required', validate: (value) => value >= today || 'Please select today or a future journey date.' })} /></Grid>
          <Grid item xs={12} sm={compact ? 1.5 : 4}><TextField select fullWidth label="Class" error={!!errors.travelClass} helperText={errors.travelClass?.message} {...register('travelClass', { required: 'Travel class is required' })}>{classes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={compact ? 1.5 : 4}><TextField select fullWidth label="Quota" error={!!errors.quota} helperText={errors.quota?.message} {...register('quota', { required: 'Quota is required' })}>{quotas.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12}><Button className="sr-search-cta" fullWidth type="submit" variant="contained" size="large" startIcon={<SearchIcon />} disabled={trains.loading}>{trains.loading ? 'Searching...' : 'Search trains'}</Button></Grid>
          {recentSearches.length > 0 && <Grid item xs={12}><RecentSearches searches={recentSearches} onSelect={applyRecentSearch} /></Grid>}
          {(sourceError || destinationError) && <Grid item xs={12}><Alert severity="warning">{sourceError || destinationError}</Alert></Grid>}
        </Grid>
      </Box>
    </Paper>
  );
}

function StationAutocomplete({ label, icon, value, inputValue, options, loading, onInput, onClear, onChange, error, helperText }) {
  return <Autocomplete value={value} inputValue={inputValue} options={options} loading={loading} filterOptions={(items) => items} getOptionLabel={(option) => option ? formatStationLabel(option) : ''} isOptionEqualToValue={(option, selected) => option?.code === selected?.code} onInputChange={(_, nextValue, reason) => { if (reason === 'input') onInput(nextValue); if (reason === 'clear') onClear(); }} onChange={(_, option) => onChange(option)} renderInput={(params) => <TextField {...params} fullWidth label={label} error={error} helperText={helperText} InputProps={{ ...params.InputProps, startAdornment: <Box className="sr-field-icon">{icon}</Box> }} />} />;
}

function RecentSearches({ searches, onSelect }) {
  return <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap className="sr-recent-row"><Typography variant="body2">Recent</Typography>{searches.slice(0, 4).map((item) => <Chip className="sr-recent-chip" key={`${item.source}-${item.destination}-${item.journeyDate}-${item.travelClass}`} label={`${item.source} → ${item.destination} · ${item.travelClass}`} onClick={() => onSelect(item)} variant="outlined" />)}</Stack>;
}

function formatStationLabel(option) { return option?.name ? `${option.code} - ${option.name}` : option?.code || ''; }
