import ExpoModulesCore
import ExpoUI
import SwiftUI

/// SwiftUI's `TabView` with its tabs grouped in `TabSection`s, which @expo/ui 58's `TabView` lacks.
/// In a sidebar each section is a heading that collapses and expands; a tab bar shows the tabs flat.
public class TabSectionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TabSections")

    ExpoUIView(SectionedTabView.self)
    ExpoUIView(SectionedTabViewSection.self)
    ExpoUIView(SectionedTabViewTab.self)
  }
}

internal final class SectionedTabViewProps: UIBaseViewProps {
  @Field var selection: String?
  var onSelectionChange = EventDispatcher()
}

internal final class SectionedTabViewSectionProps: UIBaseViewProps {
  @Field var title: String = ""
}

internal final class SectionedTabViewTabProps: UIBaseViewProps {
  @Field var value: String = ""
  @Field var label: String = ""
  @Field var systemImage: String = ""
  /// A full-colour image (a file or bundle URL) shown instead of `systemImage`, in its own colours.
  @Field var image: String?
  @Field var imageScale: Double = 1
  @Field var badge: String?
}

/// Markers: `SectionedTabView` reads their props and children to build `TabSection` and `Tab`.
internal struct SectionedTabViewSection: ExpoSwiftUI.View {
  @ObservedObject var props: SectionedTabViewSectionProps
  var body: some View { Children() }
}

internal struct SectionedTabViewTab: ExpoSwiftUI.View {
  @ObservedObject var props: SectionedTabViewTabProps
  var body: some View { Children() }
}

internal struct SectionedTabView: ExpoSwiftUI.View {
  @ObservedObject var props: SectionedTabViewProps
  @State private var isPhonePortrait = false

  var body: some View {
    if #available(iOS 18.0, *) {
      Group {
        // Workaround (iOS 27.1, phone idiom): with the sidebar placement in a portrait window - an
        // unfolded iPhone Duo held upright - the navigation bar sits inside the top safe-area inset.
        // SwiftUI hosts a `TabSection`'s tabs in an extra hosting view that hit-tests that inset as
        // its own, so the back button, the bar buttons and the sidebar button get no touches. A flat
        // list of tabs has no such view, so the phone drops the sections while it is portrait.
        if isPhonePortrait {
          SwiftUI.TabView(selection: selection) {
            ForEach(sections.flatMap(Self.tabs(in:)), id: \.props.value) { tab in
              Self.tab(tab)
            }
          }
        } else {
          SwiftUI.TabView(selection: selection) {
            ForEach(sections, id: \.props.title) { section in
              TabSection(section.props.title) {
                ForEach(Self.tabs(in: section), id: \.props.value) { tab in
                  Self.tab(tab)
                }
              }
            }
          }
        }
      }
      .onGeometryChange(for: Bool.self) { proxy in
        proxy.size.height > proxy.size.width
      } action: { portrait in
        isPhonePortrait = portrait && UIDevice.current.userInterfaceIdiom == .phone
      }
    } else {
      // Before iOS 18 there are no sections: a plain tab bar with every tab.
      SwiftUI.TabView(selection: selection) {
        ForEach(sections.flatMap(Self.tabs(in:)), id: \.props.value) { tab in
          Self.content(of: tab)
            .tabItem { Self.label(of: tab) }
            .tag(tab.props.value)
        }
      }
    }
  }

  @available(iOS 18.0, *)
  private static func tab(_ tab: SectionedTabViewTab) -> some TabContent<String> {
    SwiftUI.Tab(value: tab.props.value) {
      content(of: tab)
    } label: {
      label(of: tab)
    }
    .badge(tab.props.badge.map { Text($0) })
  }

  /// The tab's label. An `image` is drawn with `.alwaysOriginal` rendering, so the tab bar and the
  /// sidebar keep its colours instead of tinting it like the SF Symbols.
  @ViewBuilder
  private static func label(of tab: SectionedTabViewTab) -> some View {
    if let image = coloredImage(tab.props) {
      Label {
        Text(tab.props.label)
      } icon: {
        Image(uiImage: image)
      }
    } else {
      Label(tab.props.label, systemImage: tab.props.systemImage)
    }
  }

  private static let imageCache = NSCache<NSString, UIImage>()

  private static func coloredImage(_ props: SectionedTabViewTabProps) -> UIImage? {
    guard let uri = props.image, let url = URL(string: uri) else { return nil }
    if let cached = imageCache.object(forKey: uri as NSString) { return cached }
    guard let data = try? Data(contentsOf: url),
      let image = UIImage(data: data, scale: props.imageScale)?.withRenderingMode(.alwaysOriginal)
    else { return nil }
    imageCache.setObject(image, forKey: uri as NSString)
    return image
  }

  private var selection: Binding<String> {
    Binding(
      get: { props.selection ?? "" },
      set: { newValue in
        if newValue != props.selection {
          props.onSelectionChange(["selection": newValue])
        }
      }
    )
  }

  private var sections: [SectionedTabViewSection] {
    (props.children ?? []).compactMap { Self.unwrap($0) }
  }

  private static func tabs(in section: SectionedTabViewSection) -> [SectionedTabViewTab] {
    (section.props.children ?? []).compactMap { unwrap($0) }
  }

  /// The tab's own body does not run inside `Tab`, so its content publishes the zero content
  /// origin that @expo/ui's views publish for themselves.
  private static func content(of tab: SectionedTabViewTab) -> some View {
    ForEach(tab.props.children ?? [], id: \.id) { child in
      let view: any View = child.childView
      AnyView(view)
    }
    .onAppear { tab.props.shadowNodeProxy.setContentOrigin?(.zero) }
  }

  private static func unwrap<T>(_ child: any ExpoSwiftUI.AnyChild) -> T? {
    if let view = child as? T { return view }
    return (child as? ExpoSwiftUI.ViewWrapper)?.getWrappedView() as? T
  }
}
