import { extendTheme, ThemeConfig, ComponentStyleConfig } from '@chakra-ui/react';

// Color palette for Viddhana theme
const colors = {
  viddhana: {
    50: '#E6F4FF',
    100: '#B8DFFF',
    200: '#8ACBFF',
    300: '#5CB6FF',
    400: '#2EA2FF',
    500: '#4A90E2', // Primary
    600: '#3A7BC8',
    700: '#2A66AE',
    800: '#1A5194',
    900: '#0A3C7A',
  },
  accent: {
    50: '#E0FAFF',
    100: '#B3F3FF',
    200: '#80EBFF',
    300: '#4DE4FF',
    400: '#1ADCFF',
    500: '#00C6FF', // Secondary
    600: '#00A3D6',
    700: '#0080AD',
    800: '#005D84',
    900: '#003A5B',
  },
  success: {
    50: '#E8F8EC',
    100: '#C6EDD0',
    200: '#A4E2B4',
    300: '#82D798',
    400: '#60CC7C',
    500: '#28A745', // KYC Verified Green
    600: '#208E3A',
    700: '#18752F',
    800: '#105C24',
    900: '#084319',
  },
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  dark: {
    bg: '#1A1A2E',
    card: '#16213E',
    border: '#0F3460',
  },
};

// Theme configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Global styles
const styles = {
  global: (props: { colorMode: string }) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
    },
    '*::selection': {
      bg: 'viddhana.200',
      color: 'viddhana.900',
    },
  }),
};

// Font configuration
const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  mono: `'JetBrains Mono', 'Fira Code', Monaco, Consolas, monospace`,
};

// Button component styles
const Button: ComponentStyleConfig = {
  baseStyle: {
    fontWeight: '600',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    _focus: {
      boxShadow: '0 0 0 3px rgba(74, 144, 226, 0.4)',
    },
  },
  variants: {
    solid: (props) => ({
      bg: props.colorScheme === 'viddhana' 
        ? 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)'
        : undefined,
      color: props.colorScheme === 'viddhana' ? 'white' : undefined,
      _hover: {
        bg: props.colorScheme === 'viddhana'
          ? 'linear-gradient(90deg, #3A80D2 0%, #00B6EF 100%)'
          : undefined,
        transform: 'translateY(-1px)',
        boxShadow: 'lg',
      },
      _active: {
        transform: 'translateY(0)',
      },
    }),
    outline: (props) => ({
      borderColor: props.colorScheme === 'viddhana' ? 'viddhana.500' : undefined,
      color: props.colorScheme === 'viddhana' ? 'viddhana.500' : undefined,
      _hover: {
        bg: props.colorScheme === 'viddhana' ? 'viddhana.50' : undefined,
        transform: 'translateY(-1px)',
      },
    }),
    ghost: (props) => ({
      color: props.colorScheme === 'viddhana' ? 'viddhana.500' : undefined,
      _hover: {
        bg: props.colorScheme === 'viddhana' ? 'viddhana.50' : undefined,
      },
    }),
    gradient: {
      bg: 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)',
      color: 'white',
      _hover: {
        bg: 'linear-gradient(90deg, #3A80D2 0%, #00B6EF 100%)',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 15px rgba(74, 144, 226, 0.4)',
      },
      _active: {
        transform: 'translateY(0)',
      },
    },
  },
  defaultProps: {
    colorScheme: 'viddhana',
  },
};

// Card component styles
const Card: ComponentStyleConfig = {
  baseStyle: (props) => ({
    container: {
      borderRadius: '12px',
      border: '1px solid',
      borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
      boxShadow: 'sm',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
      _hover: {
        boxShadow: 'md',
        transform: 'translateY(-2px)',
      },
    },
    header: {
      bg: props.colorMode === 'dark' 
        ? 'rgba(74, 144, 226, 0.1)'
        : 'linear-gradient(135deg, rgba(74, 144, 226, 0.05) 0%, rgba(0, 198, 255, 0.05) 100%)',
      borderBottom: '1px solid',
      borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
      py: 3,
      px: 4,
    },
    body: {
      py: 4,
      px: 4,
    },
    footer: {
      borderTop: '1px solid',
      borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
      py: 3,
      px: 4,
    },
  }),
  variants: {
    elevated: (props) => ({
      container: {
        boxShadow: 'lg',
        _hover: {
          boxShadow: 'xl',
        },
      },
    }),
    outline: (props) => ({
      container: {
        boxShadow: 'none',
        borderColor: props.colorMode === 'dark' ? 'viddhana.700' : 'viddhana.200',
      },
    }),
    filled: (props) => ({
      container: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
      },
    }),
    stats: (props) => ({
      container: {
        position: 'relative',
        bg: props.colorMode === 'dark' 
          ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        _before: {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          bg: 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)',
        },
      },
    }),
  },
  defaultProps: {
    variant: 'filled',
  },
};

// Badge component styles
const Badge: ComponentStyleConfig = {
  baseStyle: {
    borderRadius: 'full',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  variants: {
    kyc: {
      bg: 'success.500',
      color: 'white',
      px: 3,
      py: 1,
    },
    kycPending: {
      bg: 'yellow.400',
      color: 'gray.800',
      px: 3,
      py: 1,
    },
    address: (props) => ({
      bg: props.colorMode === 'dark' ? 'viddhana.900' : 'viddhana.50',
      color: props.colorMode === 'dark' ? 'viddhana.200' : 'viddhana.700',
      fontFamily: 'mono',
      px: 2,
      py: 0.5,
    }),
  },
};

// Input component styles
const Input: ComponentStyleConfig = {
  variants: {
    search: (props) => ({
      field: {
        borderRadius: '24px',
        border: '2px solid',
        borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        px: 5,
        py: 3,
        _focus: {
          borderColor: 'viddhana.500',
          boxShadow: '0 0 0 4px rgba(74, 144, 226, 0.15)',
        },
        _placeholder: {
          color: 'gray.400',
        },
      },
    }),
  },
};

// Table component styles
const Table: ComponentStyleConfig = {
  variants: {
    simple: (props) => ({
      th: {
        bg: props.colorMode === 'dark'
          ? 'rgba(74, 144, 226, 0.15)'
          : 'linear-gradient(135deg, rgba(74, 144, 226, 0.08) 0%, rgba(0, 198, 255, 0.08) 100%)',
        color: 'viddhana.500',
        textTransform: 'uppercase',
        fontSize: 'xs',
        fontWeight: '600',
        letterSpacing: '0.5px',
      },
      tr: {
        _hover: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.50',
        },
      },
    }),
  },
};

// Tooltip component styles
const Tooltip: ComponentStyleConfig = {
  baseStyle: {
    bg: 'gray.800',
    color: 'white',
    borderRadius: 'md',
    px: 3,
    py: 2,
    fontSize: 'sm',
  },
};

// Modal component styles
const Modal: ComponentStyleConfig = {
  baseStyle: (props) => ({
    dialog: {
      borderRadius: '12px',
      bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
    },
    header: {
      borderBottom: '1px solid',
      borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
    },
    closeButton: {
      _hover: {
        bg: props.colorMode === 'dark' ? 'gray.700' : 'gray.100',
      },
    },
  }),
};

// Skeleton component styles
const Skeleton: ComponentStyleConfig = {
  baseStyle: {
    borderRadius: '8px',
  },
};

// Combined component overrides
const components = {
  Button,
  Card,
  Badge,
  Input,
  Table,
  Tooltip,
  Modal,
  Skeleton,
};

// Semantic tokens for color mode support
const semanticTokens = {
  colors: {
    'bg.primary': {
      default: 'white',
      _dark: 'gray.900',
    },
    'bg.secondary': {
      default: 'gray.50',
      _dark: 'gray.800',
    },
    'bg.card': {
      default: 'white',
      _dark: 'gray.800',
    },
    'text.primary': {
      default: 'gray.800',
      _dark: 'gray.100',
    },
    'text.secondary': {
      default: 'gray.600',
      _dark: 'gray.400',
    },
    'border.primary': {
      default: 'gray.200',
      _dark: 'gray.700',
    },
    'accent.primary': {
      default: 'viddhana.500',
      _dark: 'viddhana.400',
    },
    'accent.secondary': {
      default: 'accent.500',
      _dark: 'accent.400',
    },
  },
};

// Layer styles for common patterns
const layerStyles = {
  gradient: {
    bg: 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)',
    color: 'white',
  },
  card: {
    bg: 'bg.card',
    borderRadius: '12px',
    border: '1px solid',
    borderColor: 'border.primary',
    boxShadow: 'sm',
  },
  statsCard: {
    bg: 'bg.card',
    borderRadius: '12px',
    position: 'relative',
    _before: {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      bg: 'linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)',
      borderTopRadius: '12px',
    },
  },
};

// Text styles for common patterns
const textStyles = {
  heading: {
    fontWeight: '700',
    lineHeight: '1.2',
    color: 'text.primary',
  },
  body: {
    fontWeight: '400',
    lineHeight: '1.6',
    color: 'text.primary',
  },
  caption: {
    fontSize: 'sm',
    color: 'text.secondary',
    lineHeight: '1.4',
  },
  mono: {
    fontFamily: 'mono',
    fontSize: 'sm',
  },
  stat: {
    fontSize: '2xl',
    fontWeight: '700',
    color: 'accent.primary',
  },
};

// Create the custom theme
const customTheme = extendTheme({
  config,
  colors,
  fonts,
  styles,
  components,
  semanticTokens,
  layerStyles,
  textStyles,
  shadows: {
    outline: '0 0 0 3px rgba(74, 144, 226, 0.4)',
  },
  radii: {
    card: '12px',
    button: '8px',
    input: '8px',
    badge: '9999px',
  },
  space: {
    4.5: '1.125rem',
  },
});

export default customTheme;

// Export individual parts for selective imports
export { colors, fonts, components, semanticTokens, layerStyles, textStyles };
