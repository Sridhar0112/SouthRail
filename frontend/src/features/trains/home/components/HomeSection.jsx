import { Container, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function HomeSection({ eyebrow, title, copy, children, id, className = '', maxWidth = 'xl' }) {
  return (
    <motion.section
      id={id}
      className={`sr-home-section ${className}`.trim()}
      aria-labelledby={id ? `${id}-title` : undefined}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Container maxWidth={maxWidth}>
        {(eyebrow || title || copy) && (
          <Stack className="sr-section-heading" spacing={0.75}>
            {eyebrow && <Typography variant="overline">{eyebrow}</Typography>}
            {title && <Typography id={id ? `${id}-title` : undefined} variant="h2">{title}</Typography>}
            {copy && <Typography color="text.secondary">{copy}</Typography>}
          </Stack>
        )}
        {children}
      </Container>
    </motion.section>
  );
}
