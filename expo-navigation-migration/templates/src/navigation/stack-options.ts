import type { NativeStackNavigationOptions } from 'expo-router';

/**
 * Shared options for every tab's native stack. iOS gets collapsing large titles. Android ignores
 * `headerLargeTitleEnabled`: this API only draws the Material 3 small top app bar, with no medium or
 * large app bar.
 */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
};
