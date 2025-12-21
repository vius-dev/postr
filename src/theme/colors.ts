/**
 * Overhauled Color System
 * Teal-first, no blues, inverted contrast philosophy
 * Primary: #2cc9b3
 */

/* -----------------------------------------------------
 * Core Brand Palette (No Blues)
 * --------------------------------------------------- */

export const brandColors = {
  primary: {
    50: '#E6FAF7',
    100: '#C8F2EC',
    200: '#9BE6DB',
    300: '#6EDACA',
    400: '#45D0BC',
    500: '#2CC9B3', // PRIMARY
    600: '#25B3A0',
    700: '#1F9C8C',
    800: '#1A8578',
    900: '#146B61',
  },

  /* Neutral tones (teal-tinted, not Twitter gray) */
  neutral: {
    50: '#F6F9F8',
    100: '#EEF2F1',
    200: '#E2E8E6',
    300: '#CBD6D2',
    400: '#9FB2AD',
    500: '#7A918C',
    600: '#5E7570',
    700: '#445B56',
    800: '#2C3F3A',
    900: '#1A2925',
  },

  /* Soft black & off-white (no pure extremes) */
  ink: '#0F1F1C',
  paper: '#FAFEFD',

  /* Accents */
  red: {
    500: '#E5484D',
    600: '#CC3E43',
  },
  green: {
    500: '#3BCF8E',
    600: '#2FB07A',
  },
  amber: {
    500: '#F4B740',
    600: '#D9A233',
  },
};


/* -----------------------------------------------------
 * Semantic Tokens (Upside-Down Philosophy)
 * --------------------------------------------------- */

export const semanticColors = {
  light: {
    /* Primary */
    primary: brandColors.primary[600],
    primaryHover: brandColors.primary[700],
    primaryDisabled: brandColors.primary[300],

    /* Backgrounds (not pure white) */
    background: brandColors.paper,
    backgroundSecondary: brandColors.neutral[50],
    backgroundTertiary: brandColors.neutral[100],

    /* Surfaces */
    surface: brandColors.neutral[100],
    surfaceHover: brandColors.neutral[200],
    surfaceActive: brandColors.neutral[300],
    surfaceDisabled: brandColors.neutral[200],

    /* Text (softer contrast) */
    textPrimary: brandColors.ink,
    textSecondary: brandColors.neutral[700],
    textTertiary: brandColors.neutral[500],
    textDisabled: brandColors.neutral[400],
    textInverse: brandColors.paper,

    /* Borders */
    border: brandColors.neutral[300],
    borderLight: brandColors.neutral[200],
    borderHeavy: brandColors.neutral[400],

    /* Interactions */
    link: brandColors.primary[600],
    linkHover: brandColors.primary[700],
    focusRing: brandColors.primary[400],

    /* Status */
    success: brandColors.green[500],
    error: brandColors.red[500],
    warning: brandColors.amber[500],
    info: brandColors.primary[500],

    /* Social */
    like: brandColors.red[500],
    repost: brandColors.green[500],
    bookmark: brandColors.amber[500],
    share: brandColors.primary[600],

    /* Inputs */
    inputBackground: brandColors.paper,
    inputBorder: brandColors.neutral[300],
    inputPlaceholder: brandColors.neutral[400],

    /* Cards */
    card: brandColors.paper,
    cardHover: brandColors.neutral[100],
    cardBorder: brandColors.neutral[200],

    /* Overlays */
    overlay: 'rgba(0, 0, 0, 0.4)',
  },

  dark: {
    /* Primary pops more in dark */
    primary: brandColors.primary[400],
    primaryHover: brandColors.primary[300],
    primaryDisabled: brandColors.primary[800],

    /* Backgrounds (not pure black) */
    background: brandColors.neutral[900],
    backgroundSecondary: brandColors.neutral[800],
    backgroundTertiary: brandColors.neutral[700],

    /* Surfaces */
    surface: brandColors.neutral[800],
    surfaceHover: brandColors.neutral[700],
    surfaceActive: brandColors.neutral[600],
    surfaceDisabled: brandColors.neutral[700],

    /* Text */
    textPrimary: brandColors.paper,
    textSecondary: brandColors.neutral[300],
    textTertiary: brandColors.neutral[400],
    textDisabled: brandColors.neutral[500],
    textInverse: brandColors.ink,

    /* Borders */
    border: brandColors.neutral[700],
    borderLight: brandColors.neutral[800],
    borderHeavy: brandColors.neutral[600],

    /* Interactions */
    link: brandColors.primary[400],
    linkHover: brandColors.primary[300],
    focusRing: brandColors.primary[600],

    /* Status */
    success: brandColors.green[500],
    error: brandColors.red[500],
    warning: brandColors.amber[500],
    info: brandColors.primary[400],

    /* Social */
    like: brandColors.red[500],
    repost: brandColors.green[500],
    bookmark: brandColors.amber[500],
    share: brandColors.primary[400],

    /* Inputs */
    inputBackground: brandColors.neutral[800],
    inputBorder: brandColors.neutral[600],
    inputPlaceholder: brandColors.neutral[500],

    /* Cards */
    card: brandColors.neutral[800],
    cardHover: brandColors.neutral[700],
    cardBorder: brandColors.neutral[600],

    /* Overlays */
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};


/* -----------------------------------------------------
 * Legacy Compatibility
 * --------------------------------------------------- */

export const colors = {
  light: {
    primary: semanticColors.light.primary,
    secondary: brandColors.neutral[600],
    background: semanticColors.light.background,
    text: semanticColors.light.textPrimary,
    card: semanticColors.light.card,
    border: semanticColors.light.border,
  },
  dark: {
    primary: semanticColors.dark.primary,
    secondary: brandColors.neutral[400],
    background: semanticColors.dark.background,
    text: semanticColors.dark.textPrimary,
    card: semanticColors.dark.card,
    border: semanticColors.dark.border,
  },
};


/* -----------------------------------------------------
 * Types & Helpers (unchanged API)
 * --------------------------------------------------- */

export type ThemeMode = 'light' | 'dark';
export type SemanticTheme = typeof semanticColors.light;


export const getThemeColors = (mode: ThemeMode = 'light') => {
  return semanticColors[mode];
};

export const getColor = (path: string, mode: ThemeMode = 'light'): string => {
  const parts = path.split('.');
  let current: any = semanticColors[mode];

  for (const p of parts) {
    if (current[p] === undefined) {
      console.warn(`Color path "${path}" not found in ${mode} theme`);
      return semanticColors[mode].primary;
    }
    current = current[p];
  }

  return current;
};

const colorSystem = {
  brand: brandColors,
  semantic: semanticColors,
  legacy: colors,
};

export default colorSystem;
