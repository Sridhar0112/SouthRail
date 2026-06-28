import { createContext, useMemo, useState } from 'react';
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles';

export const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

const SURFACE_LIGHT = '#FFFFFF';
const SURFACE_DARK = '#0D1D19';

function getPalette(mode) {
  const isLight = mode === 'light';
  return {
    primary: {
      main: isLight ? '#0D6B4B' : '#2DD4A0',
      light: isLight ? '#1A8F68' : '#6EE7C0',
      dark: isLight ? '#064E3B' : '#0D6B4B',
      contrastText: isLight ? '#FFFFFF' : '#0D1D19'
    },
    secondary: {
      main: isLight ? '#C78D2E' : '#F0C75E',
      light: isLight ? '#E0A83E' : '#F4D98A',
      dark: isLight ? '#9A6B18' : '#C78D2E',
      contrastText: isLight ? '#FFFFFF' : '#1A2E28'
    },
    success: { main: isLight ? '#0D6B4B' : '#2DD4A0', light: isLight ? '#D1FAE5' : '#064E3B' },
    warning: { main: isLight ? '#C78D2E' : '#F0C75E', light: isLight ? '#FEF3C7' : '#78350F' },
    error: { main: isLight ? '#DC2626' : '#F87171', light: isLight ? '#FEE2E2' : '#7F1D1D' },
    info: { main: isLight ? '#3B82F6' : '#60A5FA', light: isLight ? '#DBEAFE' : '#1E3A5F' },
    background: {
      default: isLight ? '#F0F5F3' : '#071713',
      paper: isLight ? SURFACE_LIGHT : SURFACE_DARK
    },
    surface: {
      raised: isLight ? '#FFFFFF' : '#0F211B',
      elevated: isLight ? '#F8FBFA' : '#152A23',
      input: isLight ? '#FAFCFB' : '#152A23'
    },
    text: {
      primary: isLight ? '#0D1D19' : '#F0F5F3',
      secondary: isLight ? '#4B665E' : '#9AB5AC',
      disabled: isLight ? '#8BA39B' : '#608076'
    },
    divider: isLight ? '#DDE9E4' : 'rgba(255,255,255,0.10)',
    action: {
      hover: isLight ? 'rgba(13,107,75,0.08)' : 'rgba(45,212,160,0.10)',
      selected: isLight ? 'rgba(13,107,75,0.14)' : 'rgba(45,212,160,0.18)',
      disabled: isLight ? '#9DB8AE' : '#4D6E64',
      disabledBackground: isLight ? '#E5EFEB' : 'rgba(255,255,255,0.06)'
    },
    custom: {
      pageBg: isLight
        ? 'linear-gradient(165deg, #F0F5F3 0%, #E8F0ED 40%, #F5F8F7 100%)'
        : 'linear-gradient(165deg, #071713 0%, #0A1D19 40%, #081B16 100%)',
      appBar: isLight ? alpha('#FFFFFF', 0.88) : alpha(SURFACE_DARK, 0.92),
      cardBorder: isLight ? '#DDE9E4' : 'rgba(255,255,255,0.10)',
      cardShadow: isLight
        ? '0 4px 24px rgba(13,107,75,0.08), 0 1px 4px rgba(13,107,75,0.04)'
        : '0 4px 28px rgba(0,0,0,0.32), 0 1px 6px rgba(0,0,0,0.12)',
      fieldBorder: isLight ? '#C5D9D2' : 'rgba(255,255,255,0.16)',
      glassBg: isLight ? alpha('#FFFFFF', 0.88) : alpha(SURFACE_DARK, 0.88),
      glassBorder: isLight ? alpha('#FFFFFF', 0.5) : alpha('#FFFFFF', 0.10),
      glassShadow: isLight
        ? '0 8px 32px rgba(13,107,75,0.10)'
        : '0 8px 32px rgba(0,0,0,0.32)',
      heroOverlay: isLight
        ? 'linear-gradient(135deg, rgba(6,78,59,0.95) 0%, rgba(13,107,75,0.80) 50%, rgba(6,78,59,0.88) 100%)'
        : 'linear-gradient(135deg, rgba(4,22,18,0.98) 0%, rgba(7,35,29,0.92) 50%, rgba(4,22,18,0.95) 100%)',
      heroGlow: isLight
        ? 'radial-gradient(ellipse at 30% 50%, rgba(192,132,252,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(45,212,160,0.12) 0%, transparent 60%)'
        : 'radial-gradient(ellipse at 30% 50%, rgba(192,132,252,0.10) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(45,212,160,0.08) 0%, transparent 60%)',
      gradientCard: isLight
        ? 'linear-gradient(135deg, rgba(13,107,75,0.06) 0%, rgba(45,212,160,0.04) 100%)'
        : 'linear-gradient(135deg, rgba(45,212,160,0.08) 0%, rgba(13,107,75,0.04) 100%)'
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
        surface: palette.surface,
        custom: palette.custom
      },
      shape: { borderRadius: 12 },
      typography: {
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        h1: { fontWeight: 800, letterSpacing: -0.03, fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1.08 },
        h2: { fontWeight: 800, letterSpacing: -0.02, fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)', lineHeight: 1.12 },
        h3: { fontWeight: 700, letterSpacing: -0.02, fontSize: 'clamp(1.35rem, 2.4vw, 1.85rem)', lineHeight: 1.18 },
        h4: { fontWeight: 700, letterSpacing: -0.01, fontSize: 'clamp(1.15rem, 1.8vw, 1.45rem)', lineHeight: 1.22 },
        h5: { fontWeight: 700, fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', lineHeight: 1.28 },
        h6: { fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 },
        subtitle1: { fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4 },
        subtitle2: { fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.4 },
        body1: { fontSize: '0.88rem', lineHeight: 1.6 },
        body2: { fontSize: '0.8rem', lineHeight: 1.55 },
        caption: { fontSize: '0.72rem', lineHeight: 1.45 },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.01 }
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: { overflowX: 'hidden' },
            body: {
              backgroundColor: palette.background.default,
              backgroundImage: palette.custom.pageBg,
              color: palette.text.primary,
              scrollBehavior: 'smooth',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              overflowX: 'hidden',
              '--southrail-glass-bg': palette.custom.glassBg,
              '--southrail-glass-border': palette.custom.glassBorder,
              '--southrail-glass-shadow': palette.custom.glassShadow,
              '--southrail-card-shadow': palette.custom.cardShadow,
              '--southrail-card-border': palette.custom.cardBorder,
              '::selection': { backgroundColor: alpha(palette.primary.main, 0.25), color: 'inherit' },
              '@media (prefers-reduced-motion: reduce)': {
                '*, *::before, *::after': {
                  animationDuration: '0.01ms !important',
                  animationIterationCount: '1 !important',
                  transitionDuration: '0.01ms !important'
                }
              },
              '&:focus-visible': { outline: `2.5px solid ${palette.primary.main}`, outlineOffset: '3px', borderRadius: 4 },
              '& :focus-visible': { outline: `2.5px solid ${palette.primary.main}`, outlineOffset: '2px', borderRadius: 4 }
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              borderColor: palette.custom.cardBorder,
              maxWidth: '100%',
              minWidth: 0,
              borderRadius: 16
            },
            elevation1: { boxShadow: palette.custom.cardShadow },
            outlined: { borderColor: palette.custom.cardBorder }
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
              minWidth: 0,
              borderRadius: 16,
              transition: 'box-shadow 250ms ease, border-color 200ms ease, transform 200ms ease',
              '&:hover': {
                boxShadow: isLight
                  ? '0 8px 32px rgba(13,107,75,0.12), 0 2px 8px rgba(13,107,75,0.06)'
                  : '0 8px 40px rgba(0,0,0,0.40)',
                borderColor: alpha(palette.primary.main, 0.25)
              }
            }
          }
        },
        MuiCardContent: {
          styleOverrides: {
            root: {
              padding: 20,
              '&:last-child': { paddingBottom: 20 }
            }
          }
        },
        MuiContainer: {
          styleOverrides: {
            root: {
              minWidth: 0,
              '@media (max-width: 599.95px)': { paddingLeft: 18, paddingRight: 18 },
              '@media (max-width: 359.95px)': { paddingLeft: 14, paddingRight: 14 }
            }
          }
        },
        MuiButton: {
          defaultProps: { size: 'medium', disableElevation: true },
          styleOverrides: {
            root: {
              minHeight: 36,
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'normal',
              transition: 'all 200ms ease',
              '&:focus-visible': {
                outline: `2.5px solid ${palette.primary.main}`,
                outlineOffset: '2.5px',
                borderRadius: 10
              }
            },
            sizeSmall: { minHeight: 30, padding: '5px 12px', fontSize: '0.8rem' },
            sizeLarge: { minHeight: 44, padding: '10px 24px', fontSize: '0.95rem' },
            containedPrimary: {
              background: isLight
                ? `linear-gradient(135deg, ${palette.primary.main}, ${palette.primary.light})`
                : palette.primary.main,
              boxShadow: isLight
                ? `0 4px 16px ${alpha(palette.primary.main, 0.25)}`
                : `0 4px 20px ${alpha(palette.primary.main, 0.20)}`,
              '&:hover': {
                background: isLight
                  ? `linear-gradient(135deg, ${palette.primary.dark}, ${palette.primary.main})`
                  : palette.primary.light,
                boxShadow: isLight
                  ? `0 6px 24px ${alpha(palette.primary.main, 0.35)}`
                  : `0 6px 28px ${alpha(palette.primary.main, 0.30)}`,
                transform: 'translateY(-1.5px)'
              },
              '&:active': { transform: 'translateY(0)' }
            },
            containedSecondary: {
              background: isLight
                ? `linear-gradient(135deg, ${palette.secondary.main}, ${palette.secondary.light})`
                : palette.secondary.main,
              boxShadow: isLight
                ? `0 4px 16px ${alpha(palette.secondary.main, 0.25)}`
                : `0 4px 20px ${alpha(palette.secondary.main, 0.20)}`
            },
            outlined: {
              borderColor: palette.custom.fieldBorder,
              borderWidth: 1.5,
              '&:hover': {
                borderColor: palette.primary.main,
                borderWidth: 1.5,
                backgroundColor: alpha(palette.primary.main, 0.06)
              }
            },
            text: {
              color: palette.text.secondary,
              '&:hover': {
                color: palette.text.primary,
                backgroundColor: alpha(palette.primary.main, 0.06)
              }
            }
          }
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              transition: 'all 180ms ease',
              '&:focus-visible': {
                outline: `2.5px solid ${palette.primary.main}`,
                outlineOffset: '2.5px'
              }
            }
          }
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: palette.surface.input,
              color: palette.text.primary,
              borderRadius: 10,
              fontSize: '0.88rem',
              transition: 'all 200ms ease',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: palette.custom.fieldBorder,
                borderWidth: 1.5
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isLight ? alpha(palette.primary.main, 0.45) : alpha(palette.primary.light, 0.55)
              },
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(palette.primary.main, 0.10)}`,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: palette.primary.main,
                  borderWidth: 2
                }
              },
              '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: palette.error.main },
              '&.Mui-disabled': {
                backgroundColor: palette.action.disabledBackground,
                color: palette.text.disabled
              },
              '& input::placeholder': { color: palette.text.disabled, opacity: 1 }
            },
            input: { padding: '10px 14px' },
            multiline: { padding: '10px 14px' }
          }
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              color: palette.text.secondary,
              fontWeight: 500,
              '&.Mui-focused': { color: palette.primary.main },
              '&.Mui-error': { color: palette.error.main }
            }
          }
        },
        MuiFormHelperText: {
          styleOverrides: {
            root: {
              color: palette.text.secondary,
              marginLeft: 2,
              marginTop: 4,
              '&.Mui-error': { color: palette.error.main }
            }
          }
        },
        MuiSelect: { styleOverrides: { icon: { color: palette.text.secondary } } },
        MuiAutocomplete: {
          styleOverrides: {
            popupIndicator: { color: palette.text.secondary },
            clearIndicator: { color: palette.text.secondary },
            paper: {
              backgroundColor: palette.surface.raised,
              color: palette.text.primary,
              border: `1px solid ${palette.custom.cardBorder}`,
              boxShadow: palette.custom.cardShadow,
              borderRadius: 12,
              marginTop: 4
            },
            option: {
              borderRadius: 8,
              margin: '2px 6px',
              padding: '8px 12px',
              '&[aria-selected="true"], &.Mui-focused': {
                backgroundColor: `${palette.action.selected} !important`
              }
            },
            groupLabel: { padding: '6px 12px' }
          }
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundColor: palette.surface.raised,
              color: palette.text.primary,
              border: `1px solid ${palette.custom.cardBorder}`,
              boxShadow: isLight
                ? '0 8px 40px rgba(13,107,75,0.12), 0 2px 8px rgba(13,107,75,0.06)'
                : '0 8px 40px rgba(0,0,0,0.40)',
              borderRadius: 12,
              marginTop: 4
            }
          }
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              margin: '2px 6px',
              padding: '8px 12px',
              '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: palette.action.selected }
            }
          }
        },
        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 8, fontWeight: 600, fontSize: '0.72rem', height: 24 },
            outlined: { borderColor: palette.custom.fieldBorder },
            sizeSmall: { height: 20, fontSize: '0.68rem' }
          }
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              border: `1px solid ${palette.custom.cardBorder}`,
              backgroundImage: 'none',
              padding: '10px 14px'
            },
            message: { minWidth: 0, overflowWrap: 'anywhere', padding: 0 },
            standardSuccess: { backgroundColor: alpha(palette.success.main, isLight ? 0.08 : 0.12), color: palette.text.primary },
            standardError: { backgroundColor: alpha(palette.error.main, isLight ? 0.08 : 0.14), color: palette.text.primary },
            standardWarning: { backgroundColor: alpha(palette.warning.main, isLight ? 0.08 : 0.14), color: palette.text.primary },
            standardInfo: { backgroundColor: alpha(palette.info.main, isLight ? 0.08 : 0.14), color: palette.text.primary }
          }
        },
        MuiDivider: { styleOverrides: { root: { borderColor: palette.divider } } },
        MuiLinearProgress: {
          styleOverrides: {
            root: { borderRadius: 999, backgroundColor: palette.action.disabledBackground, height: 4 }
          }
        },
        MuiStepIcon: {
          styleOverrides: {
            root: {
              color: isLight ? alpha('#000000', 0.15) : alpha('#FFFFFF', 0.20),
              '&.Mui-active': { color: palette.primary.main },
              '&.Mui-completed': { color: palette.success.main }
            },
            text: { fontWeight: 700 }
          }
        },
        MuiStepLabel: {
          styleOverrides: {
            label: {
              color: palette.text.secondary,
              fontWeight: 500,
              '&.Mui-active, &.Mui-completed': { color: palette.text.primary, fontWeight: 700 }
            }
          }
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 20,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100dvh - 32px)',
              margin: 16,
              boxShadow: isLight
                ? '0 24px 80px rgba(13,107,75,0.15), 0 8px 24px rgba(13,107,75,0.08)'
                : '0 24px 80px rgba(0,0,0,0.50)'
            }
          }
        },
        MuiDialogTitle: {
          styleOverrides: { root: { fontSize: '1.1rem', fontWeight: 700, padding: '20px 24px 8px' } }
        },
        MuiDialogContent: {
          styleOverrides: { root: { minWidth: 0, overflowWrap: 'anywhere', padding: '8px 24px 12px' } }
        },
        MuiDialogActions: {
          styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } }
        },
        MuiTableContainer: {
          styleOverrides: { root: { maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12 } }
        },
        MuiTable: {
          styleOverrides: { root: { borderCollapse: 'separate', borderSpacing: 0 } }
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              overflowWrap: 'anywhere',
              padding: '10px 14px',
              fontSize: '0.82rem',
              borderBottom: `1px solid ${palette.divider}`
            },
            head: {
              fontWeight: 700,
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: 0.06,
              color: palette.text.secondary,
              backgroundColor: alpha(palette.background.default, 0.6),
              borderBottom: `2px solid ${palette.divider}`
            }
          }
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              transition: 'background-color 150ms ease',
              '&:hover': { backgroundColor: palette.action.hover }
            }
          }
        },
        MuiTablePagination: {
          styleOverrides: {
            root: { color: palette.text.secondary },
            select: { color: palette.text.primary },
            selectIcon: { color: palette.text.secondary },
            actions: { color: palette.text.primary }
          }
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: palette.custom.appBar,
              color: palette.text.primary,
              backgroundImage: 'none',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: isLight
                ? '0 1px 0 rgba(13,107,75,0.06), 0 4px 16px rgba(13,107,75,0.04)'
                : '0 1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.15)'
            }
          }
        },
        MuiToolbar: {
          styleOverrides: { root: { minHeight: '56px !important', '@media (min-width:600px)': { minHeight: '56px !important' } } }
        },
        MuiAvatar: {
          styleOverrides: {
            root: {
              boxShadow: isLight
                ? `0 2px 8px ${alpha(palette.primary.main, 0.20)}`
                : `0 2px 8px ${alpha(palette.primary.main, 0.15)}`
            }
          }
        },
        MuiSnackbar: {
          styleOverrides: {
            root: { '& .MuiPaper-root': { borderRadius: 12 } }
          }
        },
        MuiToggleButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              borderColor: palette.custom.fieldBorder,
              '&.Mui-selected': {
                backgroundColor: palette.action.selected,
                color: palette.primary.main
              }
            }
          }
        },
        MuiToggleButtonGroup: {
          styleOverrides: { root: { gap: 0 } }
        },
        MuiSpeedDial: {
          styleOverrides: {
            fab: { borderRadius: 16 }
          }
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 500
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
