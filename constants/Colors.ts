export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFD93D',
    tint: '#0a7ea4',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFD93D',
    tint: '#FFFFFF',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
  },
};

export type ColorScheme = typeof Colors.light & typeof Colors.dark;