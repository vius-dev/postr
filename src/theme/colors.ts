/**
 * Color system for Twitter-like application
 * Based on Twitter/X's design language with light/dark theme support
 */

// Core Twitter-inspired colors (X platform)
export const twitterColors = {
  // Twitter Blue variations (primary brand color)
  blue: {
    50:  '#E8F4FD',
    100: '#D1E9FA',
    200: '#A3D3F5',
    300: '#75BCF0',
    400: '#47A6EB',
    500: '#1D9BF0', // Primary Twitter Blue
    600: '#1A8CD8',
    700: '#177CC0',
    800: '#146BA8',
    900: '#115B90',
  },
  
  // Twitter/X Black & White
  black: '#000000',
  white: '#FFFFFF',
  
  // Twitter Gray scale
  gray: {
    50:  '#F7F9F9',
    100: '#EFF3F4',
    200: '#E7ECED',
    300: '#CFD9DE',
    400: '#8B98A5',
    500: '#71767B', // Default text gray
    600: '#5C646A',
    700: '#464F55',
    800: '#31363B',
    900: '#1A1D21',
  },
  
  // Twitter Accent colors
  red: {
    500: '#F91880', // Like/Heart color
    600: '#E01673',
  },
  green: {
    500: '#00BA7C', // Success/Retweet color
    600: '#00A76F',
  },
  yellow: {
    500: '#FFD400', // Highlight/Bookmark
    600: '#E6BF00',
  },
};

// Semantic color tokens
export const semanticColors = {
  light: {
    // Primary colors
    primary: twitterColors.blue[500],
    primaryHover: twitterColors.blue[600],
    primaryDisabled: twitterColors.blue[300],
    
    // Background colors
    background: twitterColors.white,
    backgroundSecondary: twitterColors.gray[50],
    backgroundTertiary: twitterColors.gray[100],
    
    // Surface colors
    surface: twitterColors.white,
    surfaceHover: twitterColors.gray[50],
    surfaceActive: twitterColors.gray[100],
    surfaceDisabled: twitterColors.gray[200],
    
    // Text colors
    textPrimary: twitterColors.black,
    textSecondary: twitterColors.gray[700],
    textTertiary: twitterColors.gray[500],
    textDisabled: twitterColors.gray[400],
    textInverse: twitterColors.white,
    
    // Border colors
    border: twitterColors.gray[300],
    borderLight: twitterColors.gray[200],
    borderHeavy: twitterColors.gray[400],
    
    // Interactive colors
    link: twitterColors.blue[500],
    linkHover: twitterColors.blue[600],
    focusRing: twitterColors.blue[300],
    
    // Status colors
    success: twitterColors.green[500],
    error: twitterColors.red[500],
    warning: twitterColors.yellow[500],
    info: twitterColors.blue[500],
    
    // Social interaction colors (Twitter specific)
    like: twitterColors.red[500],
    retweet: twitterColors.green[500],
    bookmark: twitterColors.yellow[500],
    share: twitterColors.blue[500],
    
    // Component-specific colors
    inputBackground: twitterColors.white,
    inputBorder: twitterColors.gray[300],
    inputPlaceholder: twitterColors.gray[400],
    
    // Card colors
    card: twitterColors.white,
    cardHover: twitterColors.gray[50],
    cardBorder: twitterColors.gray[200],
  },
  
  dark: {
    // Primary colors
    primary: twitterColors.blue[500],
    primaryHover: twitterColors.blue[400],
    primaryDisabled: twitterColors.blue[800],
    
    // Background colors
    background: twitterColors.black,
    backgroundSecondary: twitterColors.gray[900],
    backgroundTertiary: twitterColors.gray[800],
    
    // Surface colors
    surface: twitterColors.gray[900],
    surfaceHover: twitterColors.gray[800],
    surfaceActive: twitterColors.gray[700],
    surfaceDisabled: twitterColors.gray[600],
    
    // Text colors
    textPrimary: twitterColors.white,
    textSecondary: twitterColors.gray[300],
    textTertiary: twitterColors.gray[400],
    textDisabled: twitterColors.gray[500],
    textInverse: twitterColors.black,
    
    // Border colors
    border: twitterColors.gray[700],
    borderLight: twitterColors.gray[800],
    borderHeavy: twitterColors.gray[600],
    
    // Interactive colors
    link: twitterColors.blue[400],
    linkHover: twitterColors.blue[300],
    focusRing: twitterColors.blue[700],
    
    // Status colors
    success: twitterColors.green[500],
    error: twitterColors.red[500],
    warning: twitterColors.yellow[500],
    info: twitterColors.blue[500],
    
    // Social interaction colors (Twitter specific)
    like: twitterColors.red[500],
    retweet: twitterColors.green[500],
    bookmark: twitterColors.yellow[500],
    share: twitterColors.blue[500],
    
    // Component-specific colors
    inputBackground: twitterColors.gray[900],
    inputBorder: twitterColors.gray[700],
    inputPlaceholder: twitterColors.gray[500],
    
    // Card colors
    card: twitterColors.gray[900],
    cardHover: twitterColors.gray[800],
    cardBorder: twitterColors.gray[700],
  },
};

// Legacy API for backward compatibility
export const colors = {
  light: {
    primary: semanticColors.light.primary,
    secondary: twitterColors.gray[500], // Using gray as secondary for Twitter-like design
    background: semanticColors.light.background,
    text: semanticColors.light.textPrimary,
    card: semanticColors.light.card,
    border: semanticColors.light.border,
  },
  dark: {
    primary: semanticColors.dark.primary,
    secondary: twitterColors.gray[400], // Using gray as secondary for Twitter-like design
    background: semanticColors.dark.background,
    text: semanticColors.dark.textPrimary,
    card: semanticColors.dark.card,
    border: semanticColors.dark.border,
  },
};

// Type definitions
export type ThemeMode = 'light' | 'dark';
export type ColorScale = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type TwitterBlueScale = Record<ColorScale, string>;
export type TwitterGrayScale = Record<ColorScale, string>;

export interface TwitterColors {
  blue: TwitterBlueScale;
  black: string;
  white: string;
  gray: TwitterGrayScale;
  red: { 500: string; 600: string };
  green: { 500: string; 600: string };
  yellow: { 500: string; 600: string };
}

export interface SemanticTheme {
  [x: string]: string | undefined;
  primary: string;
  primaryHover: string;
  primaryDisabled: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  surfaceDisabled: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderHeavy: string;
  link: string;
  linkHover: string;
  focusRing: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  like: string;
  retweet: string;
  bookmark: string;
  share: string;
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;
  card: string;
  cardHover: string;
  cardBorder: string;
}

export interface ColorSystem {
  twitter: TwitterColors;
  semantic: {
    light: SemanticTheme;
    dark: SemanticTheme;
  };
  legacy: {
    light: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      card: string;
      border: string;
    };
    dark: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      card: string;
      border: string;
    };
  };
}

// Helper functions
export const getThemeColors = (mode: ThemeMode = 'light'): SemanticTheme => {
  return semanticColors[mode];
};

export const getColor = (path: string, mode: ThemeMode = 'light'): string => {
  const paths = path.split('.');
  let current: any = semanticColors[mode];
  
  for (const p of paths) {
    if (current[p] === undefined) {
      console.warn(`Color path "${path}" not found in ${mode} theme`);
      return semanticColors[mode].primary;
    }
    current = current[p];
  }
  
  return current;
};

// Export the complete color system
const colorSystem: ColorSystem = {
  twitter: twitterColors,
  semantic: semanticColors,
  legacy: colors,
};

export default colorSystem;