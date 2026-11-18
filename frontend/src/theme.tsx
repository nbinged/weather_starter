import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export const themes = [
  { id: 'apple', name: 'Apple', description: 'The original frosted blue interface' },
  { id: 'coastal-mist', name: 'Coastal Mist', description: 'Soft slate blue and seafoam glass' },
  { id: 'aurora', name: 'Aurora', description: 'Luminous violet and teal glass' },
  {
    id: 'midnight-radar',
    name: 'Midnight Radar',
    description: 'Charcoal dashboard with cyan radar signals',
  },
  {
    id: 'paper-almanac',
    name: 'Paper Almanac',
    description: 'Warm editorial paper in ink and rust',
  },
  { id: 'solar-pop', name: 'Solar Pop', description: 'Bright yellow, coral, and sky blue' },
  {
    id: 'desert-heat',
    name: 'Desert Heat',
    description: 'Sun-baked sand, terracotta, and midnight blue',
  },
] as const;

export type ThemeId = (typeof themes)[number]['id'];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = 'weather-starter-theme';

function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const savedTheme = window.localStorage.getItem(storageKey);
    return isThemeId(savedTheme) ? savedTheme : 'apple';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
