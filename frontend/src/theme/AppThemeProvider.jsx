import { createContext, useMemo, useState } from 'react';
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles';

export const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

function getPalette(mode) {
  const isLight = mode === 'light';

  return {
    primary: isLight
      ? { main: '#0B4FD9', light: '#2F7BFF', dark: '#062B6F', contrastText: '#FFFFFF' }
      : { main: '#62A8FF', light: '#A7D1FF', dark: '#1B66D2', contrastText: '#061934' },
    secondary: isLight
      ? { main: '#F59E0B', light: '#FBBF24', dark: '#B45309', contrastText: '#071A3A' }
      : { main: '#FDBA2D', light: '#FFE08A', dark: '#D97706', contrastText: '#071A3A' },
    success: isLight ? { main: '#0E9F6E' } : { main: '#38D9A9' },
    warning: isLight ? { main: '#F59E0B' } : { main: '#FDBA2D' },
    error: isLight ? { main: '#B42318' } : { main: '#F87171' },
    info: isLight ? { main: '#2563EB' } : { main: '#60A5FA' },
    background: {
      default: isLight ? '#F4F8FF' : '#061226',
      paper: isLight ? '#FFFFFF' : '#0B1B33'
    },
    surface: {
      raised: isLight ? '#FFFFFF' : '#0E223F',
      elevated: isLight ? '#EEF6FF' : '#132B4D',
      input: isLight ? '#FFFFFF' : '#102541'
    },
    text: {
      primary: isLight ? '#071A3A' : '#F4F8FF',
      secondary: isLight ? '#50627D' : '#B8CAE6',
      disabled: isLight ? '#8798B3' : '#7185A3'
    },
    divider: isLight ? '#D9E6F7' : 'rgba(210,230,255,0.14)',
    action: {
      hover: isLight ? 'rgba(11,79,217,0.07)' : 'rgba(167,209,255,0.09)',
      selected: isLight ? 'rgba(47,123,255,0.12)' : 'rgba(98,168,255,0.18)',
      disabled: isLight ? '#8EA0BA' : '#7287A8',
      disabledBackground: isLight ? '#E6EEF9' : 'rgba(210,230,255,0.08)'
    },
    custom: {
      pageBackground: isLight
        ? 'radial-gradient(circle at top left, rgba(47,123,255,0.14), transparent 34%), linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)'
        : 'radial-gradient(circle at top left, rgba(98,168,255,0.16), transparent 36%), linear-gradient(180deg, #061226 0%, #08182E 100%)',
      appBar: isLight ? alpha('#FFFFFF', 0.9) : alpha('#0B1B33', 0.9),
      cardBorder: isLight ? '#D8E6F8' : 'rgba(210,230,255,0.14)',
      cardShadow: isLight ? '0 18px 44px rgba(7,26,58,0.10)' : '0 18px 46px rgba(0,0,0,0.34)',
      fieldBorder: isLight ? '#C7D8F0' : 'rgba(210,230,255,0.20)',
      heroOverlay: isLight
        ? 'linear-gradient(120deg, rgba(5,19,46,0.96), rgba(8,54,130,0.86) 52%, rgba(10,88,190,0.64))'
        : 'linear-gradient(120deg, rgba(3,10,24,0.98), rgba(7,28,62,0.92) 52%, rgba(10,70,155,0.70))',
      heroGlow: isLight
        ? 'radial-gradient(circle at 82% 18%, rgba(251,191,36,0.34), transparent 28%), radial-gradient(circle at 18% 82%, rgba(86,185,255,0.22), transparent 32%)'
        : 'radial-gradient(circle at 82% 18%, rgba(253,186,45,0.22), transparent 30%), radial-gradient(circle at 14% 82%, rgba(98,168,255,0.18), transparent 34%)',
      glassBg: isLight ? alpha('#FFFFFF', 0.9) : alpha('#0B1B33', 0.88),
      glassBorder: isLight ? alpha('#FFFFFF', 0.72) : alpha('#D2E6FF', 0.16),
      glassShadow: isLight ? '0 24px 60px rgba(7,26,58,0.18)' : '0 24px 64px rgba(0,0,0,0.42)'
    }
  };
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(localStorage.getItem('southrail_mode') || 'light');
  const contextValue = useMemo(() => ({
    mode,
    toggleColorMode: () => {
      setMode((current) => {
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem('southrail_mode', next);
        return next;
      });
    }
  }), [mode]);

  const theme = useMemo(() => {
    const palette = getPalette(mode);
    const isLight = mode === 'light';

    return createTheme({
      palette: {
        mode,
        primary: palette.primary,
        secondary: palette.secondary,
        success: palette.success,
        warning: palette.warning,
        error: palette.error,
        info: palette.info,
        background: palette.background,
        text: palette.text,
        divider: palette.divider,
        action: palette.action,
        // Expose the extended design tokens on the theme palette itself so
        // components can consume them via `theme.palette.surface.*` and
        // `theme.palette.custom.*` (in addition to the CSS variables already
        // wired up on the body via MuiCssBaseline below).
        surface: palette.surface,
        custom: palette.custom
      },
      shape: { borderRadius: 14 },
      typography: {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        h1: { fontWeight: 800, letterSpacing: -0.5, fontSize: 'clamp(1.9rem, 4.2vw, 2.9rem)', lineHeight: 1.06 },
        h2: { fontWeight: 800, letterSpacing: -0.4, fontSize: 'clamp(1.62rem, 3.2vw, 2.25rem)', lineHeight: 1.1 },
        h3: { fontWeight: 750, letterSpacing: -0.3, fontSize: 'clamp(1.36rem, 2.5vw, 1.85rem)', lineHeight: 1.14 },
        h4: { fontWeight: 800, letterSpacing: -0.2, fontSize: 'clamp(1.18rem, 2vw, 1.48rem)', lineHeight: 1.2 },
        h5: { fontWeight: 800, letterSpacing: -0.1, fontSize: 'clamp(1.04rem, 1.5vw, 1.22rem)', lineHeight: 1.24 },
        h6: { fontWeight: 800, letterSpacing: -0.05, fontSize: '1rem', lineHeight: 1.28 },
        body1: { fontSize: '0.95rem', lineHeight: 1.6 },
        body2: { fontSize: '0.875rem', lineHeight: 1.5 },
        button: { textTransform: 'none', fontWeight: 700 }
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: palette.background.default,
              backgroundImage: palette.custom.pageBackground,
              color: palette.text.primary,
              '--southrail-hero-overlay': palette.custom.heroOverlay,
              '--southrail-hero-glow': palette.custom.heroGlow,
              '--southrail-glass-bg': palette.custom.glassBg,
              '--southrail-glass-border': palette.custom.glassBorder,
              '--southrail-glass-shadow': palette.custom.glassShadow,
              '--southrail-card-shadow': palette.custom.cardShadow,
              '--southrail-raised-surface': palette.surface.raised,
              '--southrail-elevated-surface': palette.surface.elevated,
              '--southrail-radius-lg': '18px',
              '--southrail-radius-xl': '26px',
              '--southrail-transition-fast': '160ms ease',
              '--southrail-focus-ring': isLight ? '0 0 0 3px rgba(245,158,11,0.35)' : '0 0 0 3px rgba(253,186,45,0.5)'
            }
          }
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: palette.custom.appBar,
              color: palette.text.primary,
              backgroundImage: 'none',
              borderBottom: `1px solid ${palette.divider}`,
              backdropFilter: 'blur(16px)',
              boxShadow: isLight ? '0 6px 18px rgba(19,35,30,0.05)' : '0 8px 22px rgba(0,0,0,0.24)'
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              borderColor: palette.custom.cardBorder,
              maxWidth: '100%',
              minWidth: 0
            },
            elevation1: {
              boxShadow: palette.custom.cardShadow
            },
            outlined: {
              borderColor: palette.custom.cardBorder
            }
          }
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: palette.surface.raised,
              backgroundImage: 'none',
              border: `1px solid ${palette.custom.cardBorder}`,
              boxShadow: palette.custom.cardShadow,
              maxWidth: '100%',
              minWidth: 0
            }
          }
        },
        MuiContainer: {
          styleOverrides: {
            root: {
              minWidth: 0,
              maxWidth: '1400px',
              paddingLeft: 24,
              paddingRight: 24,
              '@media (max-width: 599.95px)': {
                paddingLeft: 16,
                paddingRight: 16
              },
              '@media (max-width: 359.95px)': {
                paddingLeft: 14,
                paddingRight: 14
              }
            }
          }
        },
        MuiCardContent: {
          styleOverrides: {
            root: {
              padding: 14,
              '&:last-child': {
                paddingBottom: 14
              }
            }
          }
        },
        MuiButton: {
          defaultProps: { size: 'medium' },
          styleOverrides: {
            root: {
              minHeight: 38,
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: '0.9rem',
              whiteSpace: 'normal'
            },
            containedPrimary: {
              boxShadow: isLight ? '0 12px 24px rgba(11,79,217,0.22)' : '0 12px 26px rgba(98,168,255,0.20)',
              '&:hover': {
                boxShadow: isLight ? '0 14px 30px rgba(11,79,217,0.28)' : '0 14px 32px rgba(98,168,255,0.26)'
              }
            },
            outlined: {
              borderColor: palette.custom.fieldBorder
            },
            text: {
              color: palette.text.secondary,
              '&:hover': {
                color: palette.text.primary
              }
            }
          }
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: palette.surface.input,
              color: palette.text.primary,
              borderRadius: 6,
              fontSize: '0.95rem',
              transition: 'background-color 160ms ease, border-color 160ms ease',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: palette.custom.fieldBorder
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isLight ? alpha(palette.primary.main, 0.56) : alpha(palette.primary.light, 0.68)
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: palette.primary.main,
                borderWidth: 2
              },
              '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                borderColor: palette.error.main
              },
              '&.Mui-disabled': {
                backgroundColor: palette.action.disabledBackground,
                color: palette.text.disabled
              },
              '& input::placeholder': {
                color: palette.text.secondary,
                opacity: isLight ? 0.72 : 0.8
              }
            },
            input: {
              color: palette.text.primary,
              padding: '10px 12px'
            }
          }
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              color: palette.text.secondary,
              '&.Mui-focused': {
                color: palette.primary.main
              },
              '&.Mui-error': {
                color: palette.error.main
              },
              '&.Mui-disabled': {
                color: palette.text.disabled
              }
            }
          }
        },
        MuiFormHelperText: {
          styleOverrides: {
            root: {
              color: palette.text.secondary,
              marginLeft: 2,
              '&.Mui-error': {
                color: palette.error.main
              }
            }
          }
        },
        MuiSelect: {
          styleOverrides: {
            icon: {
              color: palette.text.secondary
            }
          }
        },
        MuiAutocomplete: {
          styleOverrides: {
            popupIndicator: {
              color: palette.text.secondary
            },
            clearIndicator: {
              color: palette.text.secondary
            },
            paper: {
              backgroundColor: palette.surface.raised,
              color: palette.text.primary,
              border: `1px solid ${palette.custom.cardBorder}`,
              boxShadow: palette.custom.cardShadow
            },
            option: {
              '&[aria-selected="true"], &.Mui-focused': {
                backgroundColor: `${palette.action.selected} !important`
              }
            }
          }
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundColor: palette.surface.raised,
              color: palette.text.primary,
              border: `1px solid ${palette.custom.cardBorder}`,
              boxShadow: palette.custom.cardShadow
            }
          }
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              '&.Mui-selected, &.Mui-selected:hover': {
                backgroundColor: palette.action.selected
              }
            }
          }
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.75rem',
              height: 24
            },
            outlined: {
              borderColor: palette.custom.fieldBorder
            }
          }
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              border: `1px solid ${palette.custom.cardBorder}`,
              backgroundImage: 'none'
            },
            message: {
              minWidth: 0,
              overflowWrap: 'anywhere'
            },
            standardSuccess: {
              backgroundColor: alpha(palette.success.main, isLight ? 0.11 : 0.16),
              color: palette.text.primary
            },
            standardError: {
              backgroundColor: alpha(palette.error.main, isLight ? 0.1 : 0.16),
              color: palette.text.primary
            },
            standardWarning: {
              backgroundColor: alpha(palette.warning.main, isLight ? 0.12 : 0.17),
              color: palette.text.primary
            },
            standardInfo: {
              backgroundColor: alpha(palette.info.main, isLight ? 0.1 : 0.16),
              color: palette.text.primary
            }
          }
        },
        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: palette.divider
            }
          }
        },
        MuiLinearProgress: {
          styleOverrides: {
            root: {
              borderRadius: 999,
              backgroundColor: palette.action.disabledBackground
            }
          }
        },
        MuiStepIcon: {
          styleOverrides: {
            root: {
              color: isLight ? '#B8C4BE' : alpha('#F4F7F5', 0.28),
              '&.Mui-active': {
                color: palette.primary.main
              },
              '&.Mui-completed': {
                color: palette.success.main
              }
            },
            text: {
              fontWeight: 800
            }
          }
        },
        MuiStepLabel: {
          styleOverrides: {
            label: {
              color: palette.text.secondary,
              overflowWrap: 'anywhere',
              '&.Mui-active, &.Mui-completed': {
                color: palette.text.primary,
                fontWeight: 800
              }
            }
          }
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'calc(100dvh - 24px)',
              margin: 12
            }
          }
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              minWidth: 0,
              overflowWrap: 'anywhere'
            }
          }
        },
        MuiTableContainer: {
          styleOverrides: {
            root: {
              maxWidth: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }
          }
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              overflowWrap: 'anywhere',
              padding: '10px 12px',
              fontSize: '0.875rem'
            },
            head: {
              fontWeight: 800,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: 0.35
            }
          }
        },
        MuiTypography: {
          styleOverrides: {
            root: {
              minWidth: 0
            },
            h2: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.65rem, 9vw, 2.15rem)',
                lineHeight: 1.08
              }
            },
            h3: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.45rem, 8vw, 1.95rem)',
                lineHeight: 1.1
              }
            },
            h4: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.25rem, 6vw, 1.6rem)',
                lineHeight: 1.15
              }
            },
            h5: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.08rem, 5vw, 1.3rem)',
                lineHeight: 1.2
              }
            }
          }
        },
        MuiAvatar: {
          styleOverrides: {
            root: {
              boxShadow: isLight ? '0 6px 16px rgba(6,78,59,0.16)' : '0 6px 18px rgba(0,0,0,0.26)'
            }
          }
        },
        MuiTablePagination: {
          styleOverrides: {
            root: {
              color: palette.text.secondary
            },
            select: {
              color: palette.text.primary
            },
            selectIcon: {
              color: palette.text.secondary
            },
            actions: {
              color: palette.text.primary
            }
          }
        }
      }
    });
  }, [mode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}
