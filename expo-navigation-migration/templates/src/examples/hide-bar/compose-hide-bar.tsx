import {
  AnimatedVisibility,
  Box,
  Button,
  Column,
  EnterTransition,
  ExitTransition,
  Host,
  LazyColumn,
  ListItem,
  Switch,
  Text,
  TopAppBar,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  background,
  clickable,
  type ExpoModifier,
  fillMaxSize,
  fillMaxWidth,
  padding,
  testID as testTag,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { type ReactNode, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nestedScrollOffset } from '../../../modules/app-bar-visibility';

import { useNavigationBarVisibility } from '@/navigation/navigation-bar-visibility';

/**
 * The shell's part: one `Host` with a Compose `Column` of the `TopAppBar` and the current screen.
 * The real `TopAppBar` sits in `AnimatedVisibility` (`shrinkVertically` / `expandVertically`), so
 * the screen below grows and shrinks with it frame by frame. The status bar inset is padding
 * outside it, as in Material 3's collapsing app bars, so content never slides under the status bar.
 * Gap: @expo/ui's `TopAppBar` takes no `scrollBehavior`, so Material 3's
 * `enterAlwaysScrollBehavior` (the bar following the finger) is not available; scrolling hides and
 * shows the whole bar instead.
 *
 * A shell with a route stack in React state hides the bar only while the Hide bar screen is on
 * top (`top?.id === hideBarRoute && hideBar`), so every other screen, including the one back from
 * it, shows the bar from its first frame. Back arrow and actions go in `TopAppBar.NavigationIcon`
 * and `TopAppBar.Actions`; keep those slots mounted, because a slot added after the first render
 * is not picked up.
 */
export function HideBarShell() {
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  // Set by the Hide bar screen while it is on top; see `HideBarScreen`.
  const [hideBar, setHideBar] = useState(false);

  return (
    <Host style={{ flex: 1 }}>
      <Column
        modifiers={[fillMaxSize(), background(colors.surface), padding(0, insets.top, 0, 0)]}>
        <AnimatedVisibility
          visible={!hideBar}
          enterTransition={EnterTransition.expandVertically()}
          exitTransition={ExitTransition.shrinkVertically()}>
          <TopAppBar windowInsets={{ start: insets.left, end: insets.right }}>
            <TopAppBar.Title>
              {/* @expo/ui's Text does not pick up the app bar's one-line title style, so set it here. */}
              <Text style={{ typography: 'titleLarge' }} maxLines={1} overflow="ellipsis">
                Hide bar
              </Text>
            </TopAppBar.Title>
          </TopAppBar>
        </AnimatedVisibility>
        <HideBarScreen onBarHidden={setHideBar} />
      </Column>
    </Host>
  );
}

const hideBarRows = Array.from({ length: 60 }, (_, index) => `Row ${index + 1}`);

/**
 * The Compose counterpart of the React Navigation and SwiftUI Hide bar screens. The same
 * platform-neutral hook decides whether the bar is hidden; the shell draws the `TopAppBar`, so the
 * screen hands `hidden` to it through `onBarHidden`, and shows the bar again when it leaves.
 * `nestedScrollOffset` (`modules/app-bar-visibility`) feeds the hook the list's real scroll offset
 * from Compose nested scrolling, the events Material 3's `TopAppBarScrollBehavior` reads; @expo/ui's
 * `LazyColumn` has no scroll events of its own.
 */
export function HideBarScreen({ onBarHidden }: { onBarHidden: (hidden: boolean) => void }) {
  const bar = useNavigationBarVisibility();
  useEffect(() => onBarHidden(bar.hidden), [onBarHidden, bar.hidden]);
  useEffect(() => () => onBarHidden(false), [onBarHidden]);

  return (
    <Screen scrollModifiers={[nestedScrollOffset(bar.reportScroll)]}>
      <Button
        onClick={bar.toggle}
        modifiers={[fillMaxWidth(), padding(16, 8, 16, 8), testTag('expo-ui-hide-bar-toggle')]}>
        <Text>{bar.hidden ? 'Show navigation bar' : 'Hide navigation bar'}</Text>
      </Button>
      <Row
        testID="expo-ui-hide-bar-on-scroll"
        title="Hide on scroll"
        supporting={
          bar.hideOnScroll
            ? 'Scroll down to hide the bar, scroll up or back to the top to show it.'
            : 'The bar stays put while you scroll.'
        }
        onClick={() => bar.setHideOnScroll(!bar.hideOnScroll)}
        trailing={<Switch value={bar.hideOnScroll} onCheckedChange={bar.setHideOnScroll} />}
      />
      <Header title={`Navigation bar: ${bar.hidden ? 'hidden' : 'shown'}`} />
      {hideBarRows.map((title) => (
        <Row key={title} testID={`expo-ui-hide-bar-${title}`} title={title} />
      ))}
    </Screen>
  );
}

/**
 * The scrolling body of a Compose screen: it takes the space between the app bar and the nav bar.
 * `scrollModifiers` go on a `Box`, a parent of the `LazyColumn`, where `Modifier.nestedScroll`
 * sees the list's scrolling (as Material 3's scroll behaviours do on a `Scaffold`). They cannot go
 * on the `LazyColumn` itself: @expo/ui registers it without view events, so its modifier events
 * never reach JS.
 */
export function Screen({
  children,
  scrollModifiers = [],
}: {
  children: ReactNode;
  scrollModifiers?: ExpoModifier[];
}) {
  if (scrollModifiers.length === 0) {
    return <LazyColumn modifiers={[weight(1), fillMaxWidth()]}>{children}</LazyColumn>;
  }
  return (
    <Box modifiers={[weight(1), fillMaxWidth(), ...scrollModifiers]}>
      <LazyColumn modifiers={[fillMaxSize()]}>{children}</LazyColumn>
    </Box>
  );
}

/** A Material section label above a group of rows. */
function Header({ title }: { title: string }) {
  const colors = useMaterialColors();
  return (
    <Text
      color={colors.primary}
      style={{ typography: 'titleSmall' }}
      modifiers={[padding(16, 20, 16, 4)]}>
      {title}
    </Text>
  );
}

/**
 * A Compose `ListItem`, tappable when `onClick` is set. Compose views take a test tag through a
 * modifier rather than a `testID` prop.
 */
function Row({
  title,
  supporting,
  onClick,
  testID,
  trailing,
}: {
  title: string;
  supporting?: string;
  onClick?: () => void;
  testID?: string;
  trailing?: ReactNode;
}) {
  return (
    <ListItem
      modifiers={[...(onClick ? [clickable(onClick)] : []), ...(testID ? [testTag(testID)] : [])]}>
      <ListItem.HeadlineContent>
        <Text>{title}</Text>
      </ListItem.HeadlineContent>
      {supporting ? (
        <ListItem.SupportingContent>
          <Text>{supporting}</Text>
        </ListItem.SupportingContent>
      ) : null}
      {trailing ? <ListItem.TrailingContent>{trailing}</ListItem.TrailingContent> : null}
    </ListItem>
  );
}
