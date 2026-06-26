import { Container, Stack, Typography } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

const columns = [
  { title: 'Book', links: ['Search trains', 'Popular routes', 'PNR status', 'My tickets'] },
  { title: 'Manage', links: ['Dashboard', 'Cancellations', 'Refund support', 'Notifications'] },
  { title: 'Company', links: ['About SouthRail', 'Help center', 'Privacy', 'Terms'] }
];

export default function HomeFooter() {
  return (
    <footer className="sr-footer">
      <Container maxWidth={false} className="sr-layout-container">
        <div className="sr-footer-grid">
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TrainIcon color="secondary" />
              <Typography variant="h5" color="white">SouthRail</Typography>
            </Stack>
            <Typography>Modern railway reservation, PNR, ticket, and support workflows for South India.</Typography>
            <div className="sr-socials" aria-label="Social links"><span>𝕏</span><span>in</span><span>▶</span></div>
          </Stack>
          {columns.map((column) => (
            <div key={column.title}>
              <Typography variant="h6" color="white">{column.title}</Typography>
              {column.links.map((link) => <a href="/" key={link}>{link}</a>)}
            </div>
          ))}
        </div>
        <Typography variant="body2" sx={{ mt: 4, color: '#8fa4c4' }}>© 2026 SouthRail. Built for reliable train booking experiences.</Typography>
      </Container>
    </footer>
  );
}
