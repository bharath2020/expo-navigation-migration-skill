import { useSyncExternalStore } from 'react';

import type { PlatformIcon } from './config';

export type NavbarItem = { id: string; title: string; icon: PlatformIcon };

/** Buttons the Navbar screen can add to its header at runtime, in the order they are added. */
export const navbarCatalog: readonly NavbarItem[] = [
  { id: 'star', title: 'Favorite', icon: { sf: 'star', md: 'star' } },
  { id: 'share', title: 'Share', icon: { sf: 'square.and.arrow.up', md: 'share' } },
  { id: 'filter', title: 'Filter', icon: { sf: 'line.3.horizontal.decrease', md: 'filter_list' } },
  { id: 'edit', title: 'Edit', icon: { sf: 'pencil', md: 'edit' } },
];

let state: readonly NavbarItem[] = navbarCatalog.slice(0, 1);
const listeners = new Set<() => void>();

function setState(next: readonly NavbarItem[]) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The header buttons currently shown on the Navbar screen. Kept outside React so the tab bar badge
 * in `(tabs)/_layout.tsx` can show the count too.
 */
export function useNavbarItems() {
  return useSyncExternalStore(subscribe, () => state);
}

export const navbarItems = {
  /** Adds the given catalog button, or the next one not shown yet. */
  add(id?: string) {
    const next = navbarCatalog.find(
      (item) => !state.includes(item) && (id === undefined || item.id === id),
    );
    if (next) setState([...state, next]);
  },
  remove(id: string) {
    setState(state.filter((item) => item.id !== id));
  },
  removeLast() {
    setState(state.slice(0, -1));
  },
};

let bottomToolbar = false;
const toolbarListeners = new Set<() => void>();

function subscribeToolbar(listener: () => void) {
  toolbarListeners.add(listener);
  return () => toolbarListeners.delete(listener);
}

/**
 * Whether the Navbar screen shows its bottom toolbar. Kept outside React because on iPhone the
 * tab bar in `(tabs)/_layout.tsx` hides while it shows: the toolbar would sit under the tab bar.
 */
export function useBottomToolbar() {
  return useSyncExternalStore(subscribeToolbar, () => bottomToolbar);
}

export function setBottomToolbar(on: boolean) {
  bottomToolbar = on;
  toolbarListeners.forEach((listener) => listener());
}
