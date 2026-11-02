import { type ColorValue, Platform, PlatformColor, useColorScheme } from 'react-native';

export type Palette = {
  background: ColorValue;
  surface: ColorValue;
  text: ColorValue;
  secondaryText: ColorValue;
  separator: ColorValue;
  accent: ColorValue;
  selected: ColorValue;
};

const ios: Palette = {
  background: PlatformColor('systemGroupedBackground'),
  surface: PlatformColor('secondarySystemGroupedBackground'),
  text: PlatformColor('label'),
  secondaryText: PlatformColor('secondaryLabel'),
  separator: PlatformColor('separator'),
  accent: PlatformColor('systemBlue'),
  selected: PlatformColor('systemFill'),
};

// Material 3 baseline surface and primary colors.
const androidLight: Palette = {
  background: '#FEF7FF',
  surface: '#F3EDF7',
  text: '#1D1B20',
  secondaryText: '#49454F',
  separator: '#CAC4D0',
  accent: '#6750A4',
  selected: '#E8DEF8',
};

const androidDark: Palette = {
  background: '#141218',
  surface: '#211F26',
  text: '#E6E0E9',
  secondaryText: '#CAC4D0',
  separator: '#49454F',
  accent: '#D0BCFF',
  selected: '#4A4458',
};

export function usePalette(): Palette {
  const scheme = useColorScheme();
  if (Platform.OS === 'ios') return ios;
  return scheme === 'dark' ? androidDark : androidLight;
}
