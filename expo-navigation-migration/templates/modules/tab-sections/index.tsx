import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import { requireNativeView } from 'expo';
import type { ReactNode } from 'react';

type SectionedTabViewProps = {
  selection: string;
  onSelectionChange: (selection: string) => void;
  /** Modifiers without event listeners, such as `tabViewStyle`. */
  modifiers?: ModifierConfig[];
  testID?: string;
  children: ReactNode;
};

type NativeSectionedTabViewProps = Omit<SectionedTabViewProps, 'onSelectionChange'> & {
  onSelectionChange: (event: { nativeEvent: { selection: string } }) => void;
};

const NativeSectionedTabView = requireNativeView<NativeSectionedTabViewProps>(
  'TabSections',
  'SectionedTabView',
);
const NativeSection = requireNativeView<{ title: string; children: ReactNode }>(
  'TabSections',
  'SectionedTabViewSection',
);
const NativeTab = requireNativeView<{
  value: string;
  label: string;
  systemImage: string;
  image?: string;
  imageScale?: number;
  badge?: string;
  testID?: string;
  children: ReactNode;
}>('TabSections', 'SectionedTabViewTab');

/**
 * A SwiftUI `TabView` whose tabs sit in `TabSection`s. @expo/ui 58's `TabView` takes only
 * `TabView.Tab` children, so this local module adds the sections. With the `sidebarAdaptable`
 * style each section is a heading in the sidebar (iPad, unfolded iPhone Duo) that collapses and
 * expands; a tab bar shows the tabs flat. Every tab must sit in a section. Place it in a `Host`.
 */
export function SectionedTabView({ onSelectionChange, ...props }: SectionedTabViewProps) {
  return (
    <NativeSectionedTabView
      {...props}
      onSelectionChange={({ nativeEvent }) => onSelectionChange(nativeEvent.selection)}
    />
  );
}

/** A `TabSection`: a titled group of tabs. */
SectionedTabView.Section = NativeSection;

/**
 * A `Tab` inside a section. `badge` is the tab's badge text, if any. `image` (a URL, with its
 * `imageScale`) replaces `systemImage` with a full-colour picture that the tab bar does not tint.
 */
SectionedTabView.Tab = NativeTab;
