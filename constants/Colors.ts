export const Colors = {
  light: {
    text: '#2C3E50',  
    textonbanner:'#ECF0F1',       // Dark slate gray for primary text
    background: '#F5F7FA',   // Light grayish blue for background
    card: '#FFFFFF',         // Pure white for cards
    primary: '#34495E',      // Dark slate blue for primary elements
    secondary: '#3498DB',    // Bright blue for secondary elements
    accent: '#E67E22',       // Soft orange for accents
    tint: '#16A085',         // Sea green for tints
    tabIconDefault: '#95A5A6',  // Grayish cyan for default icons
    tabIconSelected: '#2980B9', // Strong blue for selected icons
    border: '#E0E6ED',       // Light grayish blue for borders
    shadow: '#BDC3C7',       // Light grayish cyan for shadows
    overlay: 'rgba(44, 62, 80, 0.1)', // Subtle dark overlay
    success: '#27AE60',      // Emerald green for success states
    error: '#E74C3C',        // Soft red for error states
    warning: '#F39C12',      // Orange for warning states
    info: '#2980B9',         // Strong blue for info states
    lineColor:'#34495E'
  },
  dark: {
    text: '#ECF0F1',         // Very light grayish blue for text
    textonbanner:'#ECF0F1',
    background: '#2C3E50',   // Dark slate gray for background
    card: '#34495E',         // Dark slate blue for cards
    primary: '#3498DB',      // Bright blue for primary elements
    secondary: '#1ABC9C',    // Turquoise for secondary elements
    accent: '#E67E22',       // Soft orange for accents (same as light for consistency)
    tint: '#2ECC71',         // Emerald green for tints
    tabIconDefault: '#95A5A6',  // Grayish cyan for default icons
    tabIconSelected: '#E74C3C', // Soft red for selected icons
    border: '#465C6E',       // Darker grayish blue for borders
    shadow: '#1A252F',       // Very dark grayish blue for shadows
    overlay: 'rgba(236, 240, 241, 0.1)', // Subtle light overlay
    success: '#4BB543',      // Emerald green for success states (same as light)
    error: '#E74C3C',        // Soft red for error states (same as light)
    warning: '#F39C12',      // Orange for warning states (same as light)
    info: '#3498DB',         // Bright blue for info states
    lineColor:'#FFFFFF'
  },
};

export type ColorScheme = typeof Colors.light & typeof Colors.dark;