import { type SFSymbol, unstable_getMaterialSymbolSourceAsync } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { type ImageSourcePropType, Platform } from 'react-native';

import type { PlatformIcon } from './config';

type ToolbarIcon = SFSymbol | ImageSourcePropType;

function sfName(icon: PlatformIcon) {
  return typeof icon.sf === 'string' ? icon.sf : icon.sf.default;
}

/**
 * Resolves platform icons for `Stack.Toolbar` items. iOS takes SF Symbol names directly. Android
 * header items take image sources only, so the Material Symbols are rendered to images first;
 * render icon buttons once `ready` is true.
 */
export function useToolbarIcons(icons: Record<string, PlatformIcon>) {
  const key = Object.entries(icons)
    .map(([id, icon]) => `${id}:${icon.md}`)
    .join(',');
  const [android, setAndroid] = useState<Record<string, ImageSourcePropType>>({});

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    Promise.all(
      Object.entries(icons).map(async ([id, icon]) => {
        const source = await unstable_getMaterialSymbolSourceAsync(icon.md, 24, '#000000');
        return [id, source] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      const resolved: Record<string, ImageSourcePropType> = {};
      for (const [id, source] of entries) {
        if (source) resolved[id] = source;
      }
      setAndroid(resolved);
    });
    return () => {
      cancelled = true;
    };
    // `key` captures the icon set; `icons` is usually a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const icon = (id: string): ToolbarIcon | undefined => {
    if (Platform.OS === 'ios') {
      const platformIcon = icons[id];
      return platformIcon ? sfName(platformIcon) : undefined;
    }
    return android[id];
  };
  const ready =
    Platform.OS === 'ios' || Object.keys(icons).every((id) => android[id] !== undefined);
  return { icon, ready };
}
