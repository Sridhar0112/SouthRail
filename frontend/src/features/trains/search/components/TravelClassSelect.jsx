import { MenuItem, TextField } from '@mui/material';
import { TRAVEL_CLASSES } from '../constants.js';

export default function TravelClassSelect({ register, error, helperText }) {
  return (
    <TextField select fullWidth label="Class" error={error} helperText={helperText} {...register('travelClass', { required: 'Travel class is required' })}>
      {TRAVEL_CLASSES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
    </TextField>
  );
}
