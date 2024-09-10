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
    border: '#E0E0E0',
    shadow: '#B0B0B0',
    overlay: 'rgba(0, 0, 0, 0.1)',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
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
    border: '#333333',
    shadow: '#000000',
    overlay: 'rgba(255, 255, 255, 0.1)',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
  },
};

export type ColorScheme = typeof Colors.light & typeof Colors.dark;
