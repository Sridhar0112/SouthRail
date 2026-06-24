import { Autocomplete, Box, TextField } from '@mui/material';

export default function StationAutocompleteField({ label, icon, value, inputValue, options, loading, onInput, onClear, onChange, error, helperText }) {
  return (
    <Autocomplete
      value={value}
      inputValue={inputValue}
      options={options}
      loading={loading}
      filterOptions={(items) => items}
      getOptionLabel={(option) => option ? formatStationLabel(option) : ''}
      isOptionEqualToValue={(option, selected) => option?.code === selected?.code}
      onInputChange={(_, nextValue, reason) => {
        if (reason === 'input') onInput(nextValue);
        if (reason === 'clear') onClear();
      }}
      onChange={(_, option) => onChange(option)}
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          label={label}
          error={error}
          helperText={helperText}
          InputProps={{ ...params.InputProps, startAdornment: <Box className="sr-field-icon" aria-hidden="true">{icon}</Box> }}
        />
      )}
    />
  );
}

function formatStationLabel(option) {
  return option?.name ? `${option.code} - ${option.name}` : option?.code || '';
}
