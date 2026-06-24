import { TextField } from '@mui/material';

export default function JourneyDateField({ today, register, error, helperText }) {
  return (
    <TextField
      fullWidth
      type="date"
      label="Journey date"
      InputLabelProps={{ shrink: true }}
      inputProps={{ min: today }}
      error={error}
      helperText={helperText}
      {...register('journeyDate', {
        required: 'Journey date is required',
        validate: (value) => value >= today || 'Please select today or a future journey date.'
      })}
    />
  );
}
