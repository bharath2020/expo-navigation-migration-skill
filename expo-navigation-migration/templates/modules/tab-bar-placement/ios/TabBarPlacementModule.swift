import ExpoModulesCore
import ExpoUI
import SwiftUI

/// Registers `defaultTabBarPlacement` with @expo/ui so a `TabView` can take it in `modifiers`.
public class TabBarPlacementModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TabBarPlacement")

    OnCreate {
      ViewModifierRegistry.register("defaultTabBarPlacement") { params, _, _ in
        DefaultTabBarPlacementModifier(placement: params["placement"] as? String)
      }
    }

    OnDestroy {
      ViewModifierRegistry.unregister("defaultTabBarPlacement")
    }
  }
}

internal struct DefaultTabBarPlacementModifier: ViewModifier {
  let placement: String?

  func body(content: Content) -> some View {
    if #available(iOS 27.0, *) {
      content.defaultTabBarPlacement(adaptablePlacement)
    } else {
      content
    }
  }

  @available(iOS 18.0, *)
  private var adaptablePlacement: AdaptableTabBarPlacement {
    switch placement {
    case "sidebar": return .sidebar
    case "tabBar": return .tabBar
    default: return .automatic
    }
  }
}
