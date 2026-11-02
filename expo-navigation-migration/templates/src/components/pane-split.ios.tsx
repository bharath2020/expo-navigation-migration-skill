import { ArrangementView, Host, RNHostView } from '@expo/ui/swift-ui';
import { arrangementViewStyle, frame } from '@expo/ui/swift-ui/modifiers';
import { Platform, StyleSheet, View } from 'react-native';

import { usePalette } from '@/theme';

import { FlexPaneSplit, type PaneSplitProps } from './flex-pane-split';

/** `ArrangementView` needs iOS 27.1; below it the children render without a container. */
const supportsArrangementView = Number.parseFloat(String(Platform.Version)) >= 27.1;

const fill = frame({ maxWidth: Infinity, maxHeight: Infinity });

/**
 * Two panes side by side. On iOS 27.1+ SwiftUI's `ArrangementView` places them: on an unfolded
 * iPhone Duo it splits along the fold, and it keeps both panes inside the safe area, clear of the
 * sidebar and the rail. Earlier iOS versions use the flex split.
 */
export function PaneSplit(props: PaneSplitProps) {
  const palette = usePalette();
  if (!supportsArrangementView) {
    return <FlexPaneSplit {...props} />;
  }
  // #region view-code:rn-panes
  return (
    <Host style={[styles.fill, { backgroundColor: palette.background }]}>
      <ArrangementView modifiers={[arrangementViewStyle('split'), fill]}>
        <ArrangementView.Primary>
          <RNHostView>
            <View style={styles.fill}>{props.primary}</View>
          </RNHostView>
        </ArrangementView.Primary>
        <ArrangementView.Secondary>
          <RNHostView>
            <View style={styles.fill}>{props.secondary}</View>
          </RNHostView>
        </ArrangementView.Secondary>
      </ArrangementView>
    </Host>
  );
  // #endregion view-code:rn-panes
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
