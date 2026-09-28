import { Fragment } from 'react';
import { Box, Link } from '@mui/material';

const INLINE_PATTERN = /(`[^`]+`|\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;

function safeHref(href) {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href) ? href : undefined;
}

function renderInline(text, keyPrefix) {
  return text.split(INLINE_PATTERN).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={key}>{renderInline(part.slice(2, -2), key)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={key}>{renderInline(part.slice(1, -1), key)}</em>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <Link key={key} href={href} target="_blank" rel="noopener noreferrer">
          {renderInline(link[1], key)}
        </Link>
      ) : <Fragment key={key}>{link[1]}</Fragment>;
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const key = `paragraph-${blocks.length}`;
    blocks.push(<p key={key}>{renderInline(paragraph.join(' '), key)}</p>);
    paragraph = [];
  };

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```([^`]*)$/);
    if (fence) {
      flushParagraph();
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const language = fence[1].trim();
      blocks.push(
        <pre key={`code-${blocks.length}`}>
          <code className={language ? `language-${language}` : undefined}>{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1].length + 1, 6);
      const Heading = `h${level}`;
      const key = `heading-${blocks.length}`;
      blocks.push(<Heading key={key}>{renderInline(heading[2], key)}</Heading>);
      index += 1;
      continue;
    }

    if (/^\s{0,3}((\*|-|_)\s*){3,}$/.test(line)) {
      flushParagraph();
      blocks.push(<hr key={`separator-${blocks.length}`} />);
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const quote = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      const key = `quote-${blocks.length}`;
      blocks.push(<blockquote key={key}>{renderInline(quote.join(' '), key)}</blockquote>);
      continue;
    }

    const listItem = line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      const ordered = Boolean(listItem[2]);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(item[3]);
        index += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      const key = `list-${blocks.length}`;
      blocks.push(
        <List key={key}>
          {items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
          ))}
        </List>
      );
      continue;
    }

    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();
  return blocks;
}

export function AssistantMarkdown({ children }) {
  return (
    <Box
      component="div"
      sx={{
        fontSize: '0.875rem',
        lineHeight: 1.6,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        '& > :first-of-type': { mt: 0 },
        '& > :last-child': { mb: 0 },
        '& p': { my: 0, mb: 1 },
        '& h2, & h3, & h4, & h5, & h6': {
          mt: 1.5,
          mb: 0.6,
          fontSize: '0.98rem',
          lineHeight: 1.35,
          fontWeight: 750
        },
        '& h3, & h4, & h5, & h6': { fontSize: '0.91rem' },
        '& ul, & ol': { my: 0.75, pl: 2.75 },
        '& li': { pl: 0.25 },
        '& li + li': { mt: 0.35 },
        '& blockquote': {
          my: 1,
          mx: 0,
          pl: 1.25,
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          color: 'text.secondary'
        },
        '& hr': { my: 1.25, border: 0, borderTop: '1px solid', borderColor: 'divider' },
        '& code': {
          px: 0.5,
          py: 0.15,
          borderRadius: 0.75,
          bgcolor: 'action.hover',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.82em'
        },
        '& pre': {
          maxWidth: '100%',
          my: 1,
          p: 1.25,
          overflowX: 'auto',
          borderRadius: 1.5,
          bgcolor: 'action.hover',
          whiteSpace: 'pre'
        },
        '& pre code': { p: 0, bgcolor: 'transparent', fontSize: '0.78rem' },
        '& a': { overflowWrap: 'anywhere', fontWeight: 600 }
      }}
    >
      {parseMarkdown(String(children ?? ''))}
    </Box>
  );
}
