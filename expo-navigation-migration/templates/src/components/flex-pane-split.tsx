import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { usePalette } from '@/theme';

export type PaneSplitProps = {
  primary: ReactNode;
  secondary: ReactNode;
  /** Space to keep clear between the panes: the Surface Duo hinge's width, or 0. */
  gap: number;
};

/**
 * Two equal panes split with flex: Android, and iOS before 27.1. The native safe area includes the
 * iPad sidebar when it floats over the content, so the panes split the space left beside it;
 * without insets the split lands on the window's centre. `SafeAreaView` reads the screen's insets
 * whatever its own position, so the panes must not apply the side insets again.
 */
export function FlexPaneSplit({ primary, secondary, gap }: PaneSplitProps) {
  const palette = usePalette();
  return (
    <SafeAreaView
      edges={{ left: true, right: true }}
      style={[styles.row, { backgroundColor: palette.background }]}>
      <View style={styles.pane}>{primary}</View>
      <View style={{ width: gap }} />
      <View style={[styles.pane, styles.secondary, { borderLeftColor: palette.separator }]}>
        {secondary}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  pane: { flex: 1 },
  secondary: { borderLeftWidth: StyleSheet.hairlineWidth },
});
