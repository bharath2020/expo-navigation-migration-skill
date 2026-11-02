import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

/**
 * One icon declared for both platforms: an SF Symbol on iOS and a Material Symbol on Android.
 * The selected variant is optional.
 */
export type PlatformIcon = {
  sf: SFSymbol | { default: SFSymbol; selected: SFSymbol };
  md: AndroidSymbol;
};

export type TabConfig = {
  /** The route name of the tab's folder under `src/app/(tabs)`. */
  name: '(stack)' | 'present' | 'navbar' | 'panes' | 'more';
  title: string;
  icon: PlatformIcon;
};

/**
 * The 4 primary tabs, then More. The native tab bar on both platforms and the iPad sidebar are
 * all built from this list in `src/app/(tabs)/_layout.tsx`.
 */
export const tabs: readonly TabConfig[] = [
  {
    name: '(stack)',
    title: 'Stack',
    icon: { sf: { default: 'square.stack', selected: 'square.stack.fill' }, md: 'layers' },
  },
  {
    name: 'present',
    title: 'Present',
    icon: {
      sf: {
        default: 'rectangle.portrait.on.rectangle.portrait',
        selected: 'rectangle.portrait.on.rectangle.portrait.fill',
      },
      md: 'open_in_new',
    },
  },
  {
    name: 'navbar',
    title: 'Navbar',
    icon: { sf: { default: 'slider.horizontal.3', selected: 'slider.horizontal.3' }, md: 'tune' },
  },
  {
    name: 'panes',
    title: 'Panes',
    icon: {
      sf: { default: 'rectangle.split.2x1', selected: 'rectangle.split.2x1.fill' },
      md: 'view_column',
    },
  },
  {
    name: 'more',
    title: 'More',
    icon: {
      sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' },
      md: 'more_horiz',
    },
  },
];

/**
 * A full-colour tab icon, drawn in its own colours instead of the tab bar's tint, to show the tab
 * bar can be customised. Each shell gives it to its middle tab: Navbar of the 5 React Navigation
 * tabs, Present of the 3 @expo/ui tabs.
 */
export const coloredTabIcon: number = require('../../assets/images/tab-colored.png');

export type MoreSection = {
  id: string;
  title: string;
  summary: string;
  icon: PlatformIcon;
};

/** Sections reached from the More tab. Adding an entry here adds a row and a pushed screen. */
export const moreSections: readonly MoreSection[] = [
  {
    id: 'notifications',
    title: 'Notifications',
    summary: 'A secondary section reached from More.',
    icon: { sf: 'bell', md: 'notifications' },
  },
  {
    id: 'bookmarks',
    title: 'Bookmarks',
    summary: 'Another section that does not fit in the 4 primary tabs.',
    icon: { sf: 'bookmark', md: 'bookmark' },
  },
  {
    id: 'settings',
    title: 'Settings',
    summary: 'App settings live behind More.',
    icon: { sf: 'gear', md: 'settings' },
  },
  {
    id: 'layout',
    title: 'Layout info',
    summary: 'Window size, platform and pane mode as the app sees them.',
    icon: { sf: 'info.circle', md: 'info' },
  },
];

export function findMoreSection(id: string) {
  return moreSections.find((section) => section.id === id);
}

export type Item = { id: string; title: string; body: string };

/** Placeholder content for the list and detail screens. */
export const items: readonly Item[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  title: `Item ${index + 1}`,
  body: `Detail content for item ${index + 1}. In the single-pane layout this screen is pushed onto the tab's native stack; in the dual-pane layout it fills the second pane.`,
}));

export function findItem(id: string) {
  return items.find((item) => item.id === id);
}
