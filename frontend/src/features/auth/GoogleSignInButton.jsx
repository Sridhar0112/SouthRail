import { useState } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
export default function GoogleSignInButton() {
 const [starting,setStarting]=useState(false);
 const start=()=>{ if(starting)return; setStarting(true); const base=(import.meta.env.VITE_API_URL||'/api').replace(/\/$/,''); window.location.assign(`${base}/oauth2/authorization/google`); };
 return <><Divider><Typography variant="caption">OR</Typography></Divider><Button type="button" variant="outlined" fullWidth disabled={starting} onClick={start} aria-label="Continue with Google" sx={{py:1.2,borderRadius:2,textTransform:'none'}} startIcon={<Box component="span" aria-hidden sx={{fontWeight:800,color:'#4285F4'}}>G</Box>}>{starting?'Connecting to Google…':'Continue with Google'}</Button></>;
}
