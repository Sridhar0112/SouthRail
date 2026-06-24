import { MenuItem, TextField } from '@mui/material';
import { QUOTAS } from '../constants.js';

export default function QuotaSelect({ register, error, helperText }) {
  return (
    <TextField select fullWidth label="Quota" error={error} helperText={helperText} {...register('quota', { required: 'Quota is required' })}>
      {QUOTAS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
    </TextField>
  );
}
