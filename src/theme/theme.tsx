import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { semanticColors, SemanticTheme } from './colors';

const THEME_STORAGE_KEY = '@user_theme_preference';

type ThemeMode = 'system' | 'light' | 'dark';

const defaultTheme: SemanticTheme = semanticColors.light;

interface ThemeContextType {
  theme: SemanticTheme;
  isDarkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  isDarkMode: false,
  themeMode: 'system',
  setThemeMode: () => { },
  toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    if (!['system', 'light', 'dark'].includes(mode)) {
      console.error('Invalid theme mode:', mode);
      return;
    }
    
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const isDarkMode =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const theme = isDarkMode ? semanticColors.dark : semanticColors.light;

  const toggleTheme = async () => {
    const nextMode = isDarkMode ? 'light' : 'dark';
    await setThemeMode(nextMode);
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);