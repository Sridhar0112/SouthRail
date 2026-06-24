import { Container, Stack, Typography } from '@mui/material';

export default function HomeSection({ eyebrow, title, copy, children, id, className = '', maxWidth = 'xl' }) {
  return (
    <section
      id={id}
      className={`sr-home-section ${className}`.trim()}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <Container maxWidth={maxWidth}>
        {(eyebrow || title || copy) && (
          <Stack className="sr-section-heading" spacing={0.5}>
            {eyebrow && <Typography variant="overline">{eyebrow}</Typography>}
            {title && <Typography id={id ? `${id}-title` : undefined} variant="h2">{title}</Typography>}
            {copy && <Typography color="text.secondary">{copy}</Typography>}
          </Stack>
        )}
        {children}
      </Container>
    </section>
  );
}
