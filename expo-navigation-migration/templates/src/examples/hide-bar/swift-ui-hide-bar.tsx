import { Button, List, Section, Text, Toggle, Toolbar } from '@expo/ui/swift-ui';
import { buttonStyle, navigationTitle, useScrollGeometryChange } from '@expo/ui/swift-ui/modifiers';

import { navigationBarHidden } from '../../../modules/swiftui-navigation-bar';

import { useNavigationBarVisibility } from '@/navigation/navigation-bar-visibility';

const rows = Array.from({ length: 60 }, (_, index) => `Row ${index + 1}`);

/**
 * The SwiftUI counterpart of the React Navigation Hide bar screen, pushed by a `NavigationStack`:
 *
 *   <NavigationDestination value="hide-bar">
 *     <HideBar />
 *   </NavigationDestination>
 *
 * The same platform-neutral hook decides whether the bar is hidden; the local
 * `navigationBarHidden` modifier applies it to the stack's navigation bar, and the List's
 * `onScrollGeometryChange` feeds it real scroll offsets.
 */
export function HideBar() {
  const bar = useNavigationBarVisibility();
  // The raw `contentOffset.y`, as in the React Navigation shell: mid-list it does not move when the
  // bar changes the List's top inset, so the bar's own change never reads as a scroll.
  const scroll = useScrollGeometryChange((geometry) =>
    bar.reportScroll(geometry.contentOffsetY, geometry.contentHeight - geometry.containerHeight),
  );

  return (
    <Toolbar modifiers={[navigationTitle('Hide bar'), navigationBarHidden(bar.hidden)]}>
      <List modifiers={scroll ? [scroll] : []}>
        <Section
          footer={
            <Text>
              {bar.hideOnScroll
                ? 'Scroll down to hide the bar, scroll up or back to the top to show it.'
                : 'The bar stays put while you scroll.'}
            </Text>
          }>
          <Button
            testID="expo-ui-hide-bar-toggle"
            label={bar.hidden ? 'Show navigation bar' : 'Hide navigation bar'}
            modifiers={[buttonStyle('borderedProminent')]}
            onPress={bar.toggle}
          />
          <Toggle
            testID="expo-ui-hide-bar-on-scroll"
            label="Hide on scroll"
            isOn={bar.hideOnScroll}
            onIsOnChange={bar.setHideOnScroll}
          />
        </Section>
        {/* UIKit turns swipe-back off while the bar is hidden; `navigationBarHidden` keeps it on,
            as react-native-screens does in the React Navigation shell. */}
        <Section
          title={`Navigation bar: ${bar.hidden ? 'hidden' : 'shown'}`}
          footer={<Text>Swipe from the edge to go back, even while the bar is hidden.</Text>}>
          {rows.map((title) => (
            <Text key={title}>{title}</Text>
          ))}
        </Section>
      </List>
    </Toolbar>
  );
}
