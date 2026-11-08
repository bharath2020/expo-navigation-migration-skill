import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useStackNavigationBar } from '@/navigation/use-stack-navigation-bar';
import { usePalette } from '@/theme';

const rows = Array.from({ length: 60 }, (_, index) => `Row ${index + 1}`);

/**
 * An Expo Router stack screen that hides the real navigation bar two ways through one
 * platform-neutral hook: a button, and scrolling (down hides it, up or back to the top shows it).
 * The same file runs on iOS and Android; `useStackNavigationBar` applies `hidden` to each
 * platform's native bar. Register it in the stack's layout, for example
 * `<Stack.Screen name="hide-bar" options={{ title: 'Hide bar' }} />`.
 */
export default function HideBarScreen() {
  const palette = usePalette();
  const bar = useStackNavigationBar();

  return (
    <>
      {/* A `Stack.Toolbar` forces `headerShown: true` over the screen's options, so declare the
        bar's items only while the bar is shown: `{bar.hidden ? null : <Stack.Toolbar>...}`. */}
      <ScrollView
        {...bar.scrollProps}
        testID="hide-bar-scroll"
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: palette.surface }]}>
          <Pressable
            testID="hide-bar-toggle"
            accessibilityRole="button"
            onPress={bar.toggle}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.accent, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={styles.buttonLabel}>
              {bar.hidden ? 'Show navigation bar' : 'Hide navigation bar'}
            </Text>
          </Pressable>
          <View style={[styles.row, { borderTopColor: palette.separator }]}>
            <Text style={[styles.label, { color: palette.text }]}>Hide on scroll</Text>
            <Switch
              testID="hide-bar-on-scroll"
              accessibilityLabel="Hide on scroll"
              value={bar.hideOnScroll}
              onValueChange={bar.setHideOnScroll}
            />
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: palette.surface }]}>
          {rows.map((title) => (
            <View
              key={title}
              testID={`hide-bar-${title}`}
              style={[styles.row, { borderTopColor: palette.separator }]}>
              <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, gap: 24 },
  section: { marginHorizontal: 16, borderRadius: 10, overflow: 'hidden' },
  button: { margin: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonLabel: { color: 'white', fontSize: 17, fontWeight: '600' },
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 17 },
});
