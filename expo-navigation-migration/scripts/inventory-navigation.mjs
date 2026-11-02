#!/usr/bin/env node
// Read-only navigation inventory for an Expo or React Native repository.
// Usage: node inventory-navigation.mjs <repo-root> [--max-locations N] [--flag <regex>]
// Prints JSON to stdout. Every signal carries path:line evidence. No dependencies; writes nothing.

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node inventory-navigation.mjs <repo-root> [--max-locations N] [--flag <regex>]
  --max-locations N  Evidence locations per signal (default 8). Re-run with 200 when a signal reports truncated > 0.
  --flag <regex>     Add signals.flagName, scanned across JS, native, JSON, YAML, .env*, plist, XML, Gradle and properties files. Count 0 means none of those files names the flag.
Lines starting with //, /* or * are skipped, including for --flag. Lines starting with # still count.
`;
const SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Pods', 'build', 'dist', '.expo', '.gradle', 'vendor', 'DerivedData',
  '.next', '.turbo', 'coverage', '.yarn', '.bun', '.pnpm-store', 'web-build',
]);
const JS_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const NATIVE_EXT = /\.(swift|kt|java|m|mm)$/;
const FLAG_EXT = new RegExp(`${JS_EXT.source}|${NATIVE_EXT.source}|\\.(json|ya?ml|plist|xml|gradle|kts|properties)$|(^|[\\\\/])\\.env[^\\\\/]*$`);
const TEST_PATH = /(^|\/)(__tests__|__mocks__|tests?|e2e)\/|\.(test|spec)\.[a-z]+$/;
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;
const MAX_FILE_BYTES = 2_000_000;
const NO_HITS = { count: 0, fileCount: 0, testOnly: false, locations: [], truncated: 0 };

const NAV_PACKAGES = [
  /^expo$/, /^react-native$/, /^react$/, /^expo-router$/, /^@react-navigation\//, /^@expo\/ui$/,
  /^react-native-screens$/, /^react-native-navigation$/, /^react-router-native$/, /^react-router$/,
  /^react-native-gesture-handler$/, /^react-native-reanimated$/, /^react-native-safe-area-context$/,
  /^react-native-tab-view$/, /^react-native-drawer-layout$/, /^@gorhom\/bottom-sheet$/,
  /^expo-hinge$/, /^expo-linking$/, /^expo-updates$/, /^expo-dev-client$/, /^expo-symbols$/,
  /^expo-build-properties$/, /^react-native-unistyles$/,
];
const FLAG_PACKAGES = [
  /launchdarkly/i, /statsig/i, /posthog/i, /unleash/i, /configcat/i, /growthbook/i, /optimizely/i,
  /split(software|\.io)|splitio/i, /flagsmith/i, /remote-config/i, /feature-?flag/i, /devcycle/i,
];

const NAV_SEARCH = /\.searchable\b|role:?\s*\.search\b|role=["']search["']|\bStack\.SearchBar\b|\bheaderSearchBarOptions\b/;

const JS_SIGNALS = {
  // Legacy or current navigators
  'react-navigation:import': /['"]@react-navigation\//,
  'react-navigation:container': /\bNavigationContainer\b|createNavigationContainerRef|createStaticNavigation/,
  'react-navigation:native-stack': /\bcreateNativeStackNavigator\b/,
  'react-navigation:js-stack': /\bcreateStackNavigator\b/,
  'react-navigation:bottom-tabs': /\bcreateBottomTabNavigator\b|\bcreateNativeBottomTabNavigator\b/,
  'react-navigation:top-tabs': /\bcreateMaterialTopTabNavigator\b/,
  'react-navigation:drawer': /\bcreateDrawerNavigator\b/,
  'react-navigation:hooks': /\buse(Navigation|Route|FocusEffect|IsFocused|NavigationState)\b\s*[(<]/,
  'react-navigation:imperative': /\bnavigation\.(navigate|push|goBack|pop|popToTop|replace|reset|dispatch|setOptions|setParams|addListener)\b/,
  'react-navigation:set-options': /\bnavigation\.setOptions\b/,
  'react-navigation:ref-global': /\bnavigationRef\b|\bisReadyRef\b/,
  'wix-navigation': /\bNavigation\.(registerComponent|setRoot|push|pop|showModal|events)\b/,
  'react-router-native': /from ['"]react-router-native['"]/,
  // Expo Router
  'expo-router:import': /from ['"]expo-router(\/[^'"]*)?['"]/,
  'expo-router:private-import': /['"]expo-router\/build\//,
  'expo-router:imperative': /\brouter\.(push|replace|back|navigate|dismiss|dismissAll|dismissTo|canGoBack|setParams)\b/,
  'expo-router:link': /<Link\b/,
  'expo-router:native-tabs': /\bNativeTabs\b|unstable-native-tabs/,
  'expo-router:stack-toolbar': /\bStack\.(Toolbar|Title|Header|BackButton|SearchBar)\b/,
  'expo-router:protected': /\b(Stack|Tabs|NativeTabs|Drawer)\.Protected\b/,
  'expo-router:expo-root': /\bExpoRoot\b|require\.context\(/,
  // @expo/ui
  'expo-ui:swift-ui': /['"]@expo\/ui\/swift-ui(\/[^'"]*)?['"]/,
  'expo-ui:jetpack-compose': /['"]@expo\/ui\/jetpack-compose(\/[^'"]*)?['"]/,
  'expo-ui:universal': /['"]@expo\/ui['"]/,
  'expo-ui:nav-containers': /(?<!\bStack\.)\b(NavigationStack|NavigationSplitView|NavigationLink|NavigationDestination|\w*TabView|\w*TabSection|NavigationBar|TopAppBar|ModalBottomSheet|BottomSheet|Popover|Toolbar(Item)?)\b/,
  // Behaviours that decide the migration
  'back:prevent-remove': /\busePreventRemove\b|['"]beforeRemove['"]/,
  'back:android-handler': /\bBackHandler\b/,
  'deeplink:config': /\blinking\s*[:=]|\bprefixes\s*:|\bgetStateFromPath\b|\bgetPathFromState\b|\bredirectSystemPath\b/,
  'deeplink:listener': /\bLinking\.(addEventListener|getInitialURL|openURL|parse|createURL)\b|\buseURL\b/,
  'modal:presentation': /\bpresentation\s*:\s*['"](modal|fullScreenModal|formSheet|pageSheet|transparentModal|containedModal)['"]/,
  'modal:rn-modal': /<Modal\b/,
  'sheet:third-party': /@gorhom\/bottom-sheet|react-native-modal|react-native-actions-sheet/,
  'nav:search': NAV_SEARCH,
  'layout:width-driven': /\buseWindowDimensions\b|\bDimensions\.get\b|\bPlatform\.isPad\b|\buserInterfaceIdiom\b|\bhorizontalSizeClass\b/,
  'layout:hinge': /expo-hinge|\buseHinge\b|useVerticalBarEdge|\bArrangementView\b/,
  'layout:split': /\bSplitView\b|\bUISplitViewController\b/,
  'state:persistence': /\binitialState\b|\bonStateChange\b|\bgetRootState\b/,
  'analytics:screen': /\bonStateChange\b|\blogScreen\w*\b|\btrackScreen\w*\b|\bsetCurrentScreen\b/,
  'flags:usage': /\buse(Feature|Flag|BoolVariation|Gate|FeatureGate|FeatureFlag\w*)\b|\bisFeatureEnabled\b|\bgetFeatureFlag\b|\bfeatureFlags?\b|\bcheckGate\b/,
  'flags:sync-store': /\bgetItemSync\b|\bMMKV\b|expo-sqlite\/kv-store/,
  'native:require-module': /\brequireNativeModule\b|\brequireNativeView\b|\bNativeModules\b/,
  // A config plugin can write the scene manifest from JS
  'native:multi-window': /\bUIApplicationSceneManifest\b|\benableSceneSupport\b/,
};

const NATIVE_SIGNALS = {
  'native:ui-navigation': /\bUINavigationController\b|\bUITabBarController\b|\bUISplitViewController\b|\bUITab\b|\bUITabGroup\b/,
  'native:swiftui-navigation': /\b(TabView|NavigationStack|NavigationSplitView|TabSection)\b|\.sidebarAdaptable\b|\btoolbar\(removing\b/,
  'native:android-navigation': /\bNavHost\b|\bNavController\b|\bFragmentManager\b|\bBottomNavigationView\b|\bNavigationRail\b/,
  'native:deep-links': /\bopenURL\b|\bcontinueUserActivity\b|\bIntentFilter\b|\bonNewIntent\b|\bNSUserActivity\b|\buserActivities\b|\bstateRestorationActivity\b|\.onDrag\b/,
  'native:multi-window': /\bUISceneDelegate\b|\bUIWindowScene\b|\bUISceneSession\b|\bExpoAppSceneDelegate\b|\brequestSceneSession\w*|\bconnectedScenes\b|\bUIApplicationSupportsMultipleScenes\b/,
  'native:window-manager': /\bWindowManager\b|\bFoldingFeature\b|\bWindowInfoTracker\b/,
  'nav:search': NAV_SEARCH,
  'layout:width-driven': /\buserInterfaceIdiom\b|\bhorizontalSizeClass\b/,
};

function args(argv) {
  const out = { root: null, maxLocations: 8, flag: null, help: false, invalid: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help' || argv[i] === '-h') {
      out.help = true;
    } else if (argv[i] === '--max-locations') {
      out.maxLocations = Number(argv[(i += 1)]);
      if (!Number.isInteger(out.maxLocations) || out.maxLocations < 0) out.invalid = true;
    } else if (argv[i] === '--flag') {
      const source = argv[(i += 1)];
      // An empty pattern matches every line, and one that is really the next option would always report "gone".
      if (!source || source.startsWith('--')) out.invalid = true;
      else {
        try {
          out.flag = new RegExp(source);
        } catch {
          out.invalid = true;
        }
      }
    } else if (!out.root) {
      out.root = argv[i];
    }
  }
  return out;
}

function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && full !== SKILL_DIR) stack.push(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  return files.sort();
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function pick(deps, patterns) {
  return Object.fromEntries(
    Object.entries(deps).filter(([name]) => patterns.some((pattern) => pattern.test(name)))
  );
}

function packageFindings(root, files) {
  const packages = [];
  for (const file of files.filter((f) => basename(f) === 'package.json')) {
    const json = readJson(file);
    if (!json) continue;
    const deps = { ...json.peerDependencies, ...json.devDependencies, ...json.dependencies };
    const navigation = pick(deps, NAV_PACKAGES);
    const flags = pick(deps, FLAG_PACKAGES);
    const postinstall = json.scripts?.postinstall ?? null;
    if (!Object.keys(navigation).length && !Object.keys(flags).length && !postinstall) continue;
    packages.push({
      path: relative(root, file) || 'package.json',
      name: json.name ?? null,
      main: json.main ?? null,
      postinstall,
      isExpoApp: Boolean(json.dependencies?.expo),
      navigation,
      flags,
      workspaces: json.workspaces ?? null,
      patchedDependencies: json.patchedDependencies ?? json.pnpm?.patchedDependencies ?? null,
    });
  }
  return packages;
}

function appConfigFindings(root, files) {
  const configs = [];
  const names = new Set(['app.json', 'app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs']);
  for (const file of files.filter((f) => names.has(basename(f)))) {
    const path = relative(root, file);
    if (!file.endsWith('.json')) {
      // Dynamic config: the agent must read it. Report the keys that appear so it knows what to look for.
      const text = readFileSync(file, 'utf8');
      configs.push({
        path,
        dynamic: true,
        mentions: ['scheme', 'plugins', 'associatedDomains', 'intentFilters', 'supportsTablet', 'newArchEnabled', 'runtimeVersion', 'updates', 'typedRoutes', 'expo-router', 'expo-build-properties', 'platforms', 'infoPlist', 'deploymentTarget'].filter((key) => text.includes(key)),
      });
      continue;
    }
    const json = readJson(file);
    if (!json) continue;
    const expo = json.expo ?? json;
    if (!expo.slug && !expo.plugins && !expo.scheme && !expo.ios && !expo.android) continue;
    const plugins = expo.plugins ?? [];
    const pluginOptions = Object.fromEntries(plugins.filter((plugin) => Array.isArray(plugin) && plugin[1] !== undefined));
    configs.push({
      path,
      dynamic: false,
      name: expo.name ?? null,
      scheme: expo.scheme ?? null,
      platforms: expo.platforms ?? null,
      plugins: plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin)),
      pluginOptions,
      experiments: expo.experiments ?? null,
      newArchEnabled: expo.newArchEnabled ?? null,
      orientation: expo.orientation ?? null,
      runtimeVersion: expo.runtimeVersion ?? null,
      updatesConfigured: Boolean(expo.updates),
      ios: {
        supportsTablet: expo.ios?.supportsTablet ?? null,
        requireFullScreen: expo.ios?.requireFullScreen ?? null,
        associatedDomains: expo.ios?.associatedDomains ?? null,
        infoPlistKeys: Object.keys(expo.ios?.infoPlist ?? {}),
        deploymentTarget: expo.ios?.deploymentTarget ?? pluginOptions['expo-build-properties']?.ios?.deploymentTarget ?? null,
      },
      android: {
        intentFilters: expo.android?.intentFilters ?? null,
        predictiveBackGestureEnabled: expo.android?.predictiveBackGestureEnabled ?? null,
      },
      web: Boolean(expo.web),
    });
  }
  return configs;
}

const routeBase = (file) => file.replace(/(\.(ios|android|native|web))?\.[a-z]+$/, '');
const isLayout = (file) => /(^|\/)_layout$/.test(routeBase(file));
const isSpecialRoute = (file) => /(^|\/)\+[^/]*$/.test(routeBase(file));

function routeFindings(root, files) {
  const layouts = files.filter((file) => JS_EXT.test(file) && isLayout(file.split(sep).join('/')));
  const roots = new Set();
  for (const layout of layouts) {
    const parts = layout.split(sep);
    const appIndex = parts.lastIndexOf('app');
    if (appIndex !== -1) roots.add(parts.slice(0, appIndex + 1).join(sep));
  }
  return [...roots].sort().map((routeRoot) => {
    const routeFiles = files
      .filter((file) => file.startsWith(routeRoot + sep) && JS_EXT.test(file))
      .map((file) => relative(routeRoot, file).split(sep).join('/'));
    return {
      path: relative(root, routeRoot),
      routeCount: new Set(routeFiles.filter((file) => !isLayout(file) && !isSpecialRoute(file)).map(routeBase)).size,
      layouts: routeFiles.filter(isLayout),
      specialFiles: routeFiles.filter(isSpecialRoute),
      groups: [...new Set(routeFiles.flatMap((file) => file.match(/\([^)/]+\)/g) ?? []))],
      dynamicRoutes: routeFiles.filter((file) => /\[[^\]]+\]/.test(file)),
      routes: routeFiles,
    };
  });
}

function scanSignals(root, files, signals, extension, maxLocations) {
  const results = Object.fromEntries(Object.keys(signals).map((key) => [key, { count: 0, files: new Set(), locations: [], testOnly: true, nonTestCount: 0 }]));
  for (const file of files.filter((f) => extension.test(f))) {
    let stat;
    try {
      stat = statSync(file);
    } catch {
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) continue;
    const path = relative(root, file).split(sep).join('/');
    const isTest = TEST_PATH.test(path);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (COMMENT_LINE.test(line)) return;
      for (const [key, pattern] of Object.entries(signals)) {
        if (!pattern.test(line)) continue;
        const result = results[key];
        result.count += 1;
        result.files.add(path);
        if (!isTest) {
          result.testOnly = false;
          result.nonTestCount += 1;
        }
        if (result.locations.length < maxLocations && !isTest) result.locations.push(`${path}:${index + 1}`);
      }
    });
  }
  return Object.fromEntries(
    Object.entries(results)
      .filter(([, result]) => result.count > 0)
      .map(([key, result]) => [key, {
        count: result.count,
        fileCount: result.files.size,
        testOnly: result.testOnly,
        locations: result.locations,
        truncated: result.nonTestCount - result.locations.length,
      }])
  );
}

function structureFindings(root, files) {
  const paths = files.map((file) => relative(root, file).split(sep).join('/'));
  const dirsWith = (test) => [...new Set(paths.filter(test).map((path) => dirname(path)))];
  const localExpoModules = dirsWith((path) => /(^|\/)expo-module\.config\.json$/.test(path));
  // A module at the repository root has dir '.', which matches nothing here, so its example app stays listed.
  const insideModule = (path) => localExpoModules.some((dir) => path.startsWith(`${dir}/`));
  const manifests = paths.filter((path) => basename(path) === 'package.json');
  const packageDirs = new Set(['.', ...manifests.map((path) => dirname(path))]);
  const mains = new Set(manifests.flatMap((path) => {
    const main = readJson(join(root, path))?.main;
    return typeof main === 'string' ? [posix.join(dirname(path), main)] : [];
  }));
  const isEntry = (path) => mains.has(path)
    || (packageDirs.has(dirname(path)) && /^(index|App|entry)(\.(ios|android|native|web))?\.(tsx|ts|jsx|js)$/.test(basename(path)));
  return {
    lockfiles: paths.filter((path) => /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/.test(path)),
    monorepoConfig: paths.filter((path) => /(^|\/)(pnpm-workspace\.yaml|turbo\.json|nx\.json|lerna\.json)$/.test(path)),
    committedNative: {
      ios: paths.some((path) => /(^|\/)ios\/[^/]+\.xcodeproj\//.test(path) || /(^|\/)ios\/Podfile$/.test(path)),
      android: paths.some((path) => /(^|\/)android\/(settings|build)\.gradle(\.kts)?$/.test(path)),
    },
    localExpoModules,
    localModulePlatforms: Object.fromEntries(
      localExpoModules.map((dir) => [dir, readJson(join(root, dir, 'expo-module.config.json'))?.platforms ?? null])
    ),
    configPlugins: paths.filter((path) => /(^|\/)(app\.plugin\.(js|ts|cjs)|plugins?\/[^/]+\.(js|ts|cjs))$/.test(path)),
    patches: paths.filter((path) => /(^|\/)patches\/.+\.patch$/.test(path)),
    navigationPatches: paths.filter((path) => /(^|\/)patches\/.*(navigation|screens|expo-router|expo%2Bui|expo\+ui|@expo).*\.patch$/.test(path)),
    customEntries: paths.filter((path) => isEntry(path) && !insideModule(path)),
    e2e: {
      maestro: dirsWith((path) => /(^|\/)\.?maestro\/.+\.ya?ml$/.test(path)),
      detox: paths.filter((path) => /(^|\/)\.detoxrc(\.(js|json))?$/.test(path)),
      playwright: paths.filter((path) => /(^|\/)playwright\.config\.[a-z]+$/.test(path)),
      appium: paths.filter((path) => /(^|\/)wdio\.[^/]*conf[^/]*$/.test(path)),
    },
    updates: paths.filter((path) => /(^|\/)eas\.json$/.test(path)),
    agentDocs: paths.filter((path) => /(^|\/)(AGENTS|CLAUDE|CONTRIBUTING)\.md$/.test(path)).slice(0, 20),
  };
}

function main() {
  const { root: target, maxLocations, flag, help, invalid } = args(process.argv.slice(2));
  if (help) {
    process.stdout.write(USAGE);
    return;
  }
  if (invalid || !target || !existsSync(target) || !statSync(target).isDirectory()) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  const root = realpathSync(target);
  const files = walk(root);
  // Always present when asked for: an absent signal would not distinguish "gone" from "not checked".
  const flagName = flag && (scanSignals(root, files, { flagName: flag }, FLAG_EXT, maxLocations).flagName ?? NO_HITS);
  const output = {
    scannedFiles: files.length,
    packages: packageFindings(root, files),
    appConfigs: appConfigFindings(root, files),
    routeTrees: routeFindings(root, files),
    structure: structureFindings(root, files),
    signals: { ...scanSignals(root, files, JS_SIGNALS, JS_EXT, maxLocations), ...(flagName && { flagName }) },
    nativeSignals: scanSignals(root, files, NATIVE_SIGNALS, NATIVE_EXT, maxLocations),
    note: 'Signals are text matches, not proof. Open the listed locations before stating a finding. When truncated > 0, re-run with --max-locations 200. Test-file hits count toward count, and never list as locations.',
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
