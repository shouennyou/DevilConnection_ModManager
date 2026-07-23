import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import '../styles/layers.css'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          'primary': '#4263EB',
          'primary-lighten-1': '#7C8EF5',
          'primary-darken-1': '#2541A6',
          'secondary': '#4A9E7D',
          'accent': '#4263EB',
          'background': '#F3F1EE',
          'surface': '#FDFCFB',
          'surfaceBright': '#FFFFFF',
          'surfaceDim': '#E7E5E4',
          'surfaceContainerLowest': '#FFFFFF',
          'surfaceContainerLow': '#F7F5F3',
          'surfaceContainer': '#EFECEA',
          'surfaceContainerHigh': '#E9E6E4',
          'surfaceContainerHighest': '#E3E0DD',
          'error': '#BA1A1A',
          'info': '#0061A4',
          'success': '#006E38',
          'warning': '#7D5700',
          'onPrimary': '#FFFFFF',
          'onSecondary': '#FFFFFF',
          'onSurface': '#1D1B1C',
          'onSurfaceVariant': '#4A4547',
        },
      },
      dark: {
        dark: true,
        colors: {
          'primary': '#7C8EF5',
          'primary-lighten-1': '#7C8EF5',
          'primary-darken-1': '#4263EB',
          'secondary': '#5FBD9E',
          'accent': '#7C8EF5',
          'background': '#141218',
          'surface': '#1D1B1C',
          'surfaceBright': '#F7F1EF',
          'surfaceDim': '#111115',
          'surfaceContainerLowest': '#0F0D13',
          'surfaceContainerLow': '#1D1B1C',
          'surfaceContainer': '#252329',
          'surfaceContainerHigh': '#302D33',
          'surfaceContainerHighest': '#3B383D',
          'error': '#FFB4AB',
          'info': '#A0C9FF',
          'success': '#7DD99B',
          'warning': '#FFCB52',
          'onPrimary': '#FFFFFF',
          'onSecondary': '#00382A',
          'onSurface': '#E6E1E5',
          'onSurfaceVariant': '#CCC4C6',
        },
      },
    },
  },
})
