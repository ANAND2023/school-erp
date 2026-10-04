import { create } from 'zustand';

export const THEME_PALETTES = [
  { name: 'Blue', color: '#3B82F6', lightId: 'lara-light-blue', darkId: 'lara-dark-blue' },
  { name: 'Indigo', color: '#6366F1', lightId: 'lara-light-indigo', darkId: 'lara-dark-indigo' },
  { name: 'Purple', color: '#8B5CF6', lightId: 'lara-light-purple', darkId: 'lara-dark-purple' },
  { name: 'Teal', color: '#14B8A6', lightId: 'lara-light-teal', darkId: 'lara-dark-teal' },
  { name: 'Green', color: '#22C55E', lightId: 'lara-light-green', darkId: 'lara-dark-green' },
  { name: 'Amber', color: '#F59E0B', lightId: 'lara-light-amber', darkId: 'lara-dark-amber' },
  { name: 'Cyan', color: '#06B6D4', lightId: 'lara-light-cyan', darkId: 'lara-dark-cyan' },
  { name: 'Pink', color: '#EC4899', lightId: 'lara-light-pink', darkId: 'lara-dark-pink' },
];

const STORAGE_THEME_KEY = 'school_erp_theme';
const STORAGE_DARK_KEY = 'school_erp_dark_mode';
const STORAGE_COLOR_KEY = 'school_erp_color';
const STORAGE_FONT_SIZE_KEY = 'school_erp_font_size';

export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 11;
export const MAX_FONT_SIZE = 20;

export function applyFontSize(size) {
  if (typeof document === 'undefined') return;
  const numSize = Number(size);
  const clampedSize = !isNaN(numSize) && numSize >= MIN_FONT_SIZE && numSize <= MAX_FONT_SIZE ? numSize : DEFAULT_FONT_SIZE;
  document.documentElement.style.fontSize = `${clampedSize}px`;
  document.documentElement.style.setProperty('--app-font-size', `${clampedSize}px`);
  if (document.body) {
    document.body.style.fontSize = `${clampedSize}px`;
  }
}

export function applyThemeLink(themeId) {
  if (typeof document === 'undefined') return;

  const isDark = themeId.includes('dark');
  const themeUrl = `/themes/${themeId}/theme.css`;

  const existingLink = document.getElementById('app-theme');

  if (existingLink) {
    if (existingLink.getAttribute('href') !== themeUrl) {
      existingLink.setAttribute('href', themeUrl);
    }
  } else {
    const link = document.createElement('link');
    link.id = 'app-theme';
    link.rel = 'stylesheet';
    link.href = themeUrl;
    document.head.appendChild(link);
  }

  // Update root HTML and body classes & color scheme
  if (isDark) {
    document.documentElement.classList.add('app-dark-mode');
    document.documentElement.classList.remove('app-light-mode');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('app-dark-mode');
    document.body.classList.remove('app-light-mode');
    document.documentElement.style.colorScheme = 'dark';
    document.body.style.backgroundColor = '#111827';
    document.body.style.color = '#f9fafb';
  } else {
    document.documentElement.classList.add('app-light-mode');
    document.documentElement.classList.remove('app-dark-mode');
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.add('app-light-mode');
    document.body.classList.remove('app-dark-mode');
    document.documentElement.style.colorScheme = 'light';
    document.body.style.backgroundColor = '#f4f6f8';
    document.body.style.color = '#1f2937';
  }
}

// Initial values from localStorage or default
const initialColorName = localStorage.getItem(STORAGE_COLOR_KEY) || 'Blue';
const initialDarkMode = localStorage.getItem(STORAGE_DARK_KEY) === 'true';
const storedFontSize = Number(localStorage.getItem(STORAGE_FONT_SIZE_KEY));
const initialFontSize = (!isNaN(storedFontSize) && storedFontSize >= MIN_FONT_SIZE && storedFontSize <= MAX_FONT_SIZE)
  ? storedFontSize
  : DEFAULT_FONT_SIZE;

const selectedPalette = THEME_PALETTES.find((p) => p.name === initialColorName) || THEME_PALETTES[0];
const initialThemeId = initialDarkMode ? selectedPalette.darkId : selectedPalette.lightId;

// Apply immediately on module load
applyThemeLink(initialThemeId);
applyFontSize(initialFontSize);

export const useThemeStore = create((set, get) => ({
  currentTheme: initialThemeId,
  currentColorName: selectedPalette.name,
  currentColorHex: selectedPalette.color,
  isDarkMode: initialDarkMode,
  fontSize: initialFontSize,
  minFontSize: MIN_FONT_SIZE,
  maxFontSize: MAX_FONT_SIZE,
  defaultFontSize: DEFAULT_FONT_SIZE,
  palettes: THEME_PALETTES,

  // Font size methods
  setFontSize: (size) => {
    const numSize = Number(size);
    const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, isNaN(numSize) ? DEFAULT_FONT_SIZE : numSize));
    localStorage.setItem(STORAGE_FONT_SIZE_KEY, String(clampedSize));
    applyFontSize(clampedSize);
    set({ fontSize: clampedSize });
  },

  increaseFontSize: (step = 1) => {
    const { fontSize } = get();
    get().setFontSize(fontSize + step);
  },

  decreaseFontSize: (step = 1) => {
    const { fontSize } = get();
    get().setFontSize(fontSize - step);
  },

  resetFontSize: () => {
    get().setFontSize(DEFAULT_FONT_SIZE);
  },

  // Change primary color (maintains current light/dark mode)
  setColor: (colorName) => {
    const palette = THEME_PALETTES.find((p) => p.name === colorName) || THEME_PALETTES[0];
    const { isDarkMode } = get();
    const nextThemeId = isDarkMode ? palette.darkId : palette.lightId;

    localStorage.setItem(STORAGE_COLOR_KEY, palette.name);
    localStorage.setItem(STORAGE_THEME_KEY, nextThemeId);
    applyThemeLink(nextThemeId);

    set({
      currentTheme: nextThemeId,
      currentColorName: palette.name,
      currentColorHex: palette.color,
    });
  },

  // Toggle or set Dark Mode explicitly
  toggleDarkMode: (overrideVal) => {
    const { currentColorName, isDarkMode } = get();
    const nextDarkMode = typeof overrideVal === 'boolean' ? overrideVal : !isDarkMode;
    const palette = THEME_PALETTES.find((p) => p.name === currentColorName) || THEME_PALETTES[0];
    const nextThemeId = nextDarkMode ? palette.darkId : palette.lightId;

    localStorage.setItem(STORAGE_DARK_KEY, String(nextDarkMode));
    localStorage.setItem(STORAGE_THEME_KEY, nextThemeId);
    applyThemeLink(nextThemeId);

    set({
      isDarkMode: nextDarkMode,
      currentTheme: nextThemeId,
    });
  },

  // Explicit setter for dark mode
  setDarkMode: (val) => {
    get().toggleDarkMode(Boolean(val));
  },

  // Set direct theme ID (e.g. 'lara-dark-indigo')
  setTheme: (themeId) => {
    const isDark = themeId.includes('dark');
    const matchedPalette = THEME_PALETTES.find((p) => (isDark ? p.darkId : p.lightId) === themeId) || THEME_PALETTES[0];

    localStorage.setItem(STORAGE_THEME_KEY, themeId);
    localStorage.setItem(STORAGE_DARK_KEY, String(isDark));
    localStorage.setItem(STORAGE_COLOR_KEY, matchedPalette.name);
    applyThemeLink(themeId);

    set({
      currentTheme: themeId,
      isDarkMode: isDark,
      currentColorName: matchedPalette.name,
      currentColorHex: matchedPalette.color,
    });
  },
}));
