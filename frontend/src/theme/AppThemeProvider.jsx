import { createContext, useMemo, useState } from 'react';
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles';

export const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

function getPalette(mode) {
  const isLight = mode === 'light';

  return {
    primary: isLight
      ? { main: '#064E3B', light: '#0F766E', dark: '#043C2E', contrastText: '#FFFFFF' }
      : { main: '#16A06F', light: '#3BBF8F', dark: '#0B5F48', contrastText: '#F4F7F5' },
    secondary: isLight
      ? { main: '#B7791F', light: '#D69E2E', dark: '#8A5A13', contrastText: '#FFFFFF' }
      : { main: '#D6A84F', light: '#E2BD70', dark: '#9F7623', contrastText: '#13231E' },
    success: isLight ? { main: '#13795B' } : { main: '#34C38F' },
    warning: isLight ? { main: '#B7791F' } : { main: '#D6A84F' },
    error: isLight ? { main: '#B42318' } : { main: '#F87171' },
    info: isLight ? { main: '#2563EB' } : { main: '#60A5FA' },
    background: {
      default: isLight ? '#F4F7F5' : '#071713',
      paper: isLight ? '#FFFFFF' : '#10251F'
    },
    surface: {
      raised: isLight ? '#FFFFFF' : '#122A24',
      elevated: isLight ? '#F9FBFA' : '#17352D',
      input: isLight ? '#FFFFFF' : '#17352D'
    },
    text: {
      primary: isLight ? '#13231E' : '#F4F7F5',
      secondary: isLight ? '#52645E' : '#B8C7C1',
      disabled: isLight ? '#8A9993' : '#74847E'
    },
    divider: isLight ? '#DDE5E1' : 'rgba(255,255,255,0.12)',
    action: {
      hover: isLight ? 'rgba(6,78,59,0.07)' : 'rgba(255,255,255,0.08)',
      selected: isLight ? 'rgba(6,78,59,0.11)' : 'rgba(22,160,111,0.18)',
      disabled: isLight ? '#93A29C' : '#70827A',
      disabledBackground: isLight ? '#E6ECE9' : 'rgba(255,255,255,0.08)'
    },
    custom: {
      pageBackground: isLight
        ? 'linear-gradient(180deg, #F8FBFA 0%, #F1F6F3 100%)'
        : 'linear-gradient(180deg, #071713 0%, #081C18 100%)',
      appBar: isLight ? alpha('#FFFFFF', 0.92) : alpha('#10251F', 0.92),
      cardBorder: isLight ? '#DDE5E1' : 'rgba(255,255,255,0.13)',
      cardShadow: isLight ? '0 10px 26px rgba(19,35,30,0.07)' : '0 12px 30px rgba(0,0,0,0.28)',
      fieldBorder: isLight ? '#C9D6D0' : 'rgba(255,255,255,0.18)',
      heroOverlay: isLight
        ? 'linear-gradient(90deg, rgba(5,40,32,0.90), rgba(5,40,32,0.62))'
        : 'linear-gradient(90deg, rgba(4,22,18,0.96), rgba(7,35,29,0.76))',
      heroGlow: isLight
        ? 'linear-gradient(180deg, rgba(214,158,46,0.20), rgba(6,78,59,0.08))'
        : 'linear-gradient(180deg, rgba(214,168,79,0.12), rgba(22,160,111,0.08))',
      glassBg: isLight ? alpha('#FFFFFF', 0.9) : alpha('#10251F', 0.9),
      glassBorder: isLight ? alpha('#FFFFFF', 0.6) : alpha('#FFFFFF', 0.16),
      glassShadow: isLight ? '0 16px 36px rgba(19,35,30,0.14)' : '0 18px 42px rgba(0,0,0,0.34)'
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
      shape: { borderRadius: 7 },
      typography: {
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        h1: { fontWeight: 800, letterSpacing: 0 },
        h2: { fontWeight: 800, letterSpacing: 0 },
        h3: { fontWeight: 750, letterSpacing: 0 },
        h4: { fontWeight: 800, letterSpacing: 0 },
        h5: { fontWeight: 800, letterSpacing: 0 },
        h6: { fontWeight: 800, letterSpacing: 0 },
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
              '--southrail-elevated-surface': palette.surface.elevated
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
              boxShadow: isLight ? '0 8px 28px rgba(19,35,30,0.06)' : '0 10px 30px rgba(0,0,0,0.28)'
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
              '@media (max-width: 599.95px)': {
                paddingLeft: 14,
                paddingRight: 14
              },
              '@media (max-width: 359.95px)': {
                paddingLeft: 12,
                paddingRight: 12
              }
            }
          }
        },
        MuiCardContent: {
          styleOverrides: {
            root: {
              '&:last-child': {
                paddingBottom: 18
              }
            }
          }
        },
        MuiButton: {
          styleOverrides: {
            root: {
              minHeight: 38,
              borderRadius: 7,
              whiteSpace: 'normal'
            },
            containedPrimary: {
              boxShadow: isLight ? '0 10px 22px rgba(6,78,59,0.20)' : '0 10px 24px rgba(22,160,111,0.24)',
              '&:hover': {
                boxShadow: isLight ? '0 12px 28px rgba(6,78,59,0.24)' : '0 12px 30px rgba(22,160,111,0.28)'
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
              borderRadius: 7,
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
              color: palette.text.primary
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
              fontSize: '0.8125rem',
              height: 26
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
              overflowWrap: 'anywhere'
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
                fontSize: 'clamp(2rem, 12vw, 2.6rem)',
                lineHeight: 1.08
              }
            },
            h3: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.8rem, 10vw, 2.4rem)',
                lineHeight: 1.1
              }
            },
            h4: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.45rem, 7vw, 2rem)',
                lineHeight: 1.15
              }
            },
            h5: {
              '@media (max-width: 599.95px)': {
                fontSize: 'clamp(1.2rem, 6vw, 1.5rem)',
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
