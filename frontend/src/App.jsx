import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrimeReactProvider } from 'primereact/api';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppRoutes } from './routes';
import { useThemeStore } from './store/themeStore';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App = () => {
  const { currentColorHex, isDarkMode, fontSize } = useThemeStore();

  // Dynamically sync MUI theme primary color with chosen PrimeReact theme color
  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: isDarkMode ? 'dark' : 'light',
        primary: {
          main: currentColorHex || '#3B82F6',
        },
        background: {
          default: isDarkMode ? '#121212' : '#f4f6f8',
          paper: isDarkMode ? '#1e1e1e' : '#ffffff',
        },
      },
      typography: {
        fontSize: fontSize || 14,
        htmlFontSize: fontSize || 14,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 6,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
          },
        },
      },
    });
  }, [currentColorHex, isDarkMode]);

  const primeConfig = {
    ripple: true,
    inputStyle: 'outlined',
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PrimeReactProvider value={primeConfig}>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <ErrorBoundary>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </PrimeReactProvider>
    </QueryClientProvider>
  );
};

export default App;
