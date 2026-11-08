import ExpoModulesCore
import ExpoUI
import SwiftUI

/// Registers `navigationBarHidden` with @expo/ui, so a screen inside a `NavigationStack` can hide
/// and show its navigation bar from React state.
public class SwiftUINavigationBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SwiftUINavigationBar")

    OnCreate {
      ViewModifierRegistry.register("navigationBarHidden") { params, _, _ in
        NavigationBarHiddenModifier(hidden: params["hidden"] as? Bool ?? false)
      }
    }

    OnDestroy {
      ViewModifierRegistry.unregister("navigationBarHidden")
    }
  }
}

/// Hides the navigation bar of the `NavigationStack` screen it is applied to.
///
/// SwiftUI's own `toolbarVisibility(.hidden, for: .navigationBar)` slides the bar, but it moves a
/// List or ScrollView by the bar's height in one frame: SwiftUI applies the new safe area outside
/// the bar's animation, and no SwiftUI transaction changes that. So the modifier drives the
/// `UINavigationController` that hosts the screen, the way UIKit apps and react-native-screens do,
/// and lays the screen out inside the same animation. Mid-list the rows stay where they are while
/// the bar slides off them; at the top they slide up and down with the bar.
internal struct NavigationBarHiddenModifier: ViewModifier {
  let hidden: Bool

  func body(content: Content) -> some View {
    content.background(NavigationBarVisibility(hidden: hidden))
  }
}

/// A zero-size child view controller of the screen, so `navigationController` is the stack's own.
private struct NavigationBarVisibility: UIViewControllerRepresentable {
  let hidden: Bool

  func makeUIViewController(context: Context) -> NavigationBarVisibilityController {
    NavigationBarVisibilityController()
  }

  func updateUIViewController(_ controller: NavigationBarVisibilityController, context: Context) {
    controller.hidden = hidden
  }
}

internal final class NavigationBarVisibilityController: UIViewController {
  var hidden = false {
    didSet {
      if hidden != oldValue {
        apply(animated: true)
        keepSwipeBack(hidden)
      }
    }
  }

  private let swipeBack = SwipeBackWhileBarHidden()

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    apply(animated: animated)
    keepSwipeBack(hidden)
  }

  /// The bar belongs to the whole stack: the screen gives it back when it is popped or its tab is
  /// left, so the next screen shows its bar. A swipe-back starts here too, so the previous screen's
  /// bar slides in with the interactive pop; if the swipe is cancelled, `viewWillAppear` hides it.
  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    keepSwipeBack(false)
    if hidden { navigationController?.setNavigationBarHidden(false, animated: animated) }
  }

  deinit {
    swipeBack.uninstall()
  }

  private func apply(animated: Bool) {
    let hidden = self.hidden
    guard let navigationController, navigationController.isNavigationBarHidden != hidden else {
      return
    }
    guard animated else {
      navigationController.setNavigationBarHidden(hidden, animated: false)
      return
    }
    // The bar's frame and the screen's new safe area change in one animation, so SwiftUI's List
    // moves with the bar instead of jumping ahead of it.
    UIView.animate(withDuration: UINavigationController.hideShowBarDuration) {
      navigationController.setNavigationBarHidden(hidden, animated: false)
      navigationController.view.layoutIfNeeded()
    }
  }

  private func keepSwipeBack(_ enabled: Bool) {
    if enabled, let navigationController {
      swipeBack.install(on: navigationController)
    } else {
      swipeBack.uninstall()
    }
  }
}

/// UIKit's own delegate for the swipe-back recognizers refuses every touch while the bar is hidden:
/// the edge swipe (`interactivePopGestureRecognizer`) and, from iOS 26, the full-width content
/// swipe (`interactiveContentPopGestureRecognizer`). react-native-screens keeps swipe-back by making
/// its stack the delegate of both; this does the same with the same rules, only while the bar is
/// hidden, and puts UIKit's delegate back as soon as the bar is shown or the screen goes away.
private final class SwipeBackWhileBarHidden: NSObject, UIGestureRecognizerDelegate {
  private weak var navigationController: UINavigationController?
  private weak var original: UIGestureRecognizerDelegate?
  private var recognizers: [UIGestureRecognizer] = []

  func install(on navigationController: UINavigationController) {
    guard self.navigationController == nil else { return }
    var recognizers = [navigationController.interactivePopGestureRecognizer]
    if #available(iOS 26, *) {
      recognizers.append(navigationController.interactiveContentPopGestureRecognizer)
    }
    self.recognizers = recognizers.compactMap { $0 }
    guard let first = self.recognizers.first else { return }
    self.navigationController = navigationController
    original = first.delegate
    for recognizer in self.recognizers where recognizer.delegate === original {
      recognizer.delegate = self
    }
  }

  func uninstall() {
    for recognizer in recognizers where recognizer.delegate === self {
      recognizer.delegate = original
    }
    recognizers = []
    navigationController = nil
    original = nil
  }

  private var canGoBack: Bool {
    guard let navigationController else { return false }
    return navigationController.viewControllers.count > 1
      && navigationController.transitionCoordinator == nil
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch)
    -> Bool
  {
    canGoBack
  }

  func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    canGoBack
  }

  /// The edge swipe wins over the List's scrolling; the content swipe yields to a scroll view that
  /// scrolls sideways.
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    gestureRecognizer === navigationController?.interactivePopGestureRecognizer
      && otherGestureRecognizer === (otherGestureRecognizer.view as? UIScrollView)?.panGestureRecognizer
  }

  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRequireFailureOf otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    guard gestureRecognizer !== navigationController?.interactivePopGestureRecognizer,
      let scrollView = otherGestureRecognizer.view as? UIScrollView,
      otherGestureRecognizer === scrollView.panGestureRecognizer
    else { return false }
    return scrollView.contentSize.width > scrollView.bounds.width
  }
}
