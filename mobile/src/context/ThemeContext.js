import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export const lightColors = {
  isDark: false,
  bg: '#f8fafc',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  headerBg: '#0284c7',
  headerText: '#ffffff',
  headerSubText: '#e0f2fe',
  primary: '#0284c7',
  primaryDark: '#0369a1',
  primaryLight: '#e0f2fe',
  primaryBorder: '#bae6fd',
  success: '#16a34a',
  successLight: '#dcfce7',
  successBorder: '#bbf7d0',
  warning: '#d97706',
  warningLight: '#fef3c7',
  warningBorder: '#fde68a',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  dangerBorder: '#fecaca',
  inputBg: '#f8fafc',
  inputBorder: '#cbd5e1',
  divider: '#f1f5f9',
  shadowColor: '#000000',
  surfaceVariant: '#f1f5f9',
};

export const darkColors = {
  isDark: true,
  bg: '#0f172a', // Deep slate navy
  cardBg: '#1e293b', // Elevated slate card
  cardBorder: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  headerBg: '#1e293b',
  headerText: '#f8fafc',
  headerSubText: '#38bdf8',
  primary: '#38bdf8',
  primaryDark: '#0284c7',
  primaryLight: '#082f49',
  primaryBorder: '#0369a1',
  success: '#4ade80',
  successLight: '#052e16',
  successBorder: '#166534',
  warning: '#fbbf24',
  warningLight: '#451a03',
  warningBorder: '#92400e',
  danger: '#f87171',
  dangerLight: '#450a0a',
  dangerBorder: '#991b1b',
  inputBg: '#0f172a',
  inputBorder: '#475569',
  divider: '#334155',
  shadowColor: '#000000',
  surfaceVariant: '#334155',
};

export const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
  colors: lightColors,
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('@school_erp_theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      } else if (systemScheme === 'dark') {
        setTheme('dark');
      }
    } catch (e) {
      console.warn('Error loading theme:', e);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem('@school_erp_theme', nextTheme);
    } catch (e) {
      console.warn('Error saving theme:', e);
    }
  };

  const setThemeMode = async (mode) => {
    if (mode !== 'light' && mode !== 'dark') return;
    setTheme(mode);
    try {
      await AsyncStorage.setItem('@school_erp_theme', mode);
    } catch (e) {
      console.warn('Error setting theme mode:', e);
    }
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
