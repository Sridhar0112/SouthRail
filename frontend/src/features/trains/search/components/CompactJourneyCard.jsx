import { Alert, Box, Button, Paper } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import JourneyDateField from './JourneyDateField.jsx';
import QuotaSelect from './QuotaSelect.jsx';
import RecentSearchChips from './RecentSearchChips.jsx';
import StationAutocompleteField from './StationAutocompleteField.jsx';
import StationSwapButton from './StationSwapButton.jsx';
import TravelClassSelect from './TravelClassSelect.jsx';

export default function CompactJourneyCard({ today, register, handleSubmit, onSubmit, onInvalid, errors, trains, selectedSource, selectedDestination, sourceInput, destinationInput, sourceOptions, destinationOptions, sourceLoading, destinationLoading, sourceError, destinationError, onSourceInput, onSourceClear, onSourceChange, onDestinationInput, onDestinationClear, onDestinationChange, recentSearches, applyRecentSearch, swap }) {
  return (
    <Paper className="sr-journey-panel" elevation={0} aria-label="Plan your train journey">
      <Box className="sr-journey-kicker"><span>Plan your journey</span><strong>Find your SouthRail train</strong></Box>
      <Box component="form" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        <input type="hidden" {...register('source', { required: 'Source station is required' })} />
        <input type="hidden" {...register('destination', { required: 'Destination station is required' })} />
        <Box className="sr-journey-grid">
          <StationAutocompleteField label="From" icon={<MyLocationIcon />} value={selectedSource} inputValue={sourceInput} options={sourceOptions} loading={sourceLoading} onInput={onSourceInput} onClear={onSourceClear} onChange={onSourceChange} error={!!errors.source} helperText={errors.source?.message} />
          <div className="sr-swap-cell"><StationSwapButton onClick={swap} /></div>
          <StationAutocompleteField label="To" icon={<LocationOnIcon />} value={selectedDestination} inputValue={destinationInput} options={destinationOptions} loading={destinationLoading} onInput={onDestinationInput} onClear={onDestinationClear} onChange={onDestinationChange} error={!!errors.destination} helperText={errors.destination?.message} />
          <JourneyDateField today={today} register={register} error={!!errors.journeyDate} helperText={errors.journeyDate?.message} />
          <TravelClassSelect register={register} error={!!errors.travelClass} helperText={errors.travelClass?.message} />
          <QuotaSelect register={register} error={!!errors.quota} helperText={errors.quota?.message} />
          <Button className="sr-search-cta" type="submit" variant="contained" startIcon={<SearchIcon />} disabled={trains.loading}>{trains.loading ? 'Searching' : 'Search'}</Button>
        </Box>
        <Box className="sr-journey-meta">
          <RecentSearchChips searches={recentSearches} onSelect={applyRecentSearch} />
          {(sourceError || destinationError) && <Alert severity="warning">{sourceError || destinationError}</Alert>}
        </Box>
      </Box>
    </Paper>
  );
}
