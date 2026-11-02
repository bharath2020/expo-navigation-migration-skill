// Run with: node --test expo-navigation-migration/scripts/inventory-navigation.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'inventory-navigation.mjs');
const extraRoots = [];
let root;

function write(path, content) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function inventory(dir, ...flags) {
  return JSON.parse(execFileSync(process.execPath, [script, dir, ...flags], { encoding: 'utf8' }));
}

// A separate temporary repository, so a new case cannot disturb the shared fixture above.
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'nav-inventory-'));
  extraRoots.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

before(() => {
  root = mkdtempSync(join(tmpdir(), 'nav-inventory-'));
  write(
    'package.json',
    JSON.stringify({
      name: 'legacy-app',
      main: './index.js',
      dependencies: {
        expo: '~55.0.0',
        'react-native': '0.83.0',
        '@react-navigation/native': '^7.0.0',
        '@react-navigation/stack': '^7.0.0',
        'react-native-screens': '~4.0.0',
        '@launchdarkly/react-native-client-sdk': '^10.0.0',
        lodash: '^4.0.0',
      },
    })
  );
  write(
    'app.json',
    JSON.stringify({
      expo: {
        slug: 'legacy',
        scheme: 'legacyapp',
        plugins: ['expo-font', ['expo-build-properties', {}]],
        ios: { supportsTablet: true, associatedDomains: ['applinks:example.com'] },
      },
    })
  );
  write('index.js', "import { registerRootComponent } from 'expo';\n");
  write(
    'src/navigation/root.tsx',
    [
      "import { NavigationContainer } from '@react-navigation/native';",
      "import { createStackNavigator } from '@react-navigation/stack';",
      'const Stack = createStackNavigator();',
      "const linking = { prefixes: ['legacyapp://'] };",
      "navigation.navigate('Item');",
      "BackHandler.addEventListener('hardwareBackPress', handler);",
    ].join('\n')
  );
  write('src/navigation/root.test.tsx', "navigation.goBack();\nusePreventRemove(true, callback);\n");
  write('node_modules/ignored/index.js', 'createDrawerNavigator();\n');
  write('patches/react-native-screens+4.0.0.patch', 'diff\n');
  write('modules/widget/expo-module.config.json', '{}');
  write('ios/Podfile', '');
  write('ios/App/Scene.swift', 'class Scene: UISceneDelegate {}\n');
  write('.maestro/smoke.yaml', 'appId: example\n');
  write('other/app/_layout.tsx', 'export default function L() {}\n');
  write('other/app/(tabs)/index.tsx', 'export default function I() {}\n');
  write('other/app/item/[id].tsx', 'export default function D() {}\n');
  write('other/app/+not-found.tsx', 'export default function N() {}\n');
});

after(() => {
  for (const dir of [root, ...extraRoots]) rmSync(dir, { recursive: true, force: true });
});

test('reports navigation and flag packages, and drops the rest', () => {
  const [pkg] = inventory(root).packages;
  assert.equal(pkg.main, './index.js');
  assert.equal(pkg.isExpoApp, true);
  assert.equal(pkg.navigation['@react-navigation/stack'], '^7.0.0');
  assert.equal(pkg.flags['@launchdarkly/react-native-client-sdk'], '^10.0.0');
  assert.equal(pkg.navigation.lodash, undefined);
});

test('reports app config scheme, plugins and link domains', () => {
  const [config] = inventory(root).appConfigs;
  assert.equal(config.scheme, 'legacyapp');
  assert.deepEqual(config.plugins, ['expo-font', 'expo-build-properties']);
  assert.deepEqual(config.ios.associatedDomains, ['applinks:example.com']);
});

test('signals carry path:line evidence and skip node_modules', () => {
  const { signals } = inventory(root);
  assert.deepEqual(signals['react-navigation:js-stack'].locations, [
    'src/navigation/root.tsx:2',
    'src/navigation/root.tsx:3',
  ]);
  assert.ok(signals['deeplink:config'].count >= 1);
  assert.ok(signals['back:android-handler'].count >= 1);
  assert.equal(signals['react-navigation:drawer'], undefined);
});

test('tests count toward a signal but never appear as evidence locations', () => {
  const { signals } = inventory(root);
  assert.equal(signals['react-navigation:imperative'].testOnly, false);
  assert.equal(signals['react-navigation:imperative'].fileCount, 2);
  assert.deepEqual(signals['react-navigation:imperative'].locations, ['src/navigation/root.tsx:5']);
  assert.equal(signals['back:prevent-remove'].testOnly, true);
  assert.deepEqual(signals['back:prevent-remove'].locations, []);
});

test('finds route trees, native code, modules, patches and e2e', () => {
  const output = inventory(root);
  const [tree] = output.routeTrees;
  assert.equal(tree.path, 'other/app');
  assert.equal(tree.routeCount, 2);
  assert.deepEqual(tree.groups, ['(tabs)']);
  assert.deepEqual(tree.specialFiles, ['+not-found.tsx']);
  assert.deepEqual(tree.dynamicRoutes, ['item/[id].tsx']);
  assert.equal(output.structure.committedNative.ios, true);
  assert.equal(output.structure.committedNative.android, false);
  assert.deepEqual(output.structure.localExpoModules, ['modules/widget']);
  assert.deepEqual(output.structure.navigationPatches, ['patches/react-native-screens+4.0.0.patch']);
  assert.deepEqual(output.structure.e2e.maestro, ['.maestro']);
  assert.ok(output.nativeSignals['native:multi-window'].count >= 1);
});

test('exits 2 with usage on a missing path', () => {
  const result = spawnSync(process.execPath, [script, join(root, 'missing')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage/);
});

test('nav-containers matches split views, suffixed tab views, sheets, popovers and toolbars', () => {
  const dir = fixture({
    'src/shell.tsx': [
      '<CustomTabView />',
      '<NavigationSplitView />',
      '<NavigationLink />',
      '<NavigationDestination />',
      '<CustomTabSection />',
      '<BottomSheet />',
      '<Popover />',
      '<ToolbarItem />',
      '<Toolbar />',
    ].join('\n'),
  });
  const { count, locations } = inventory(dir, '--max-locations', '20').signals['expo-ui:nav-containers'];
  assert.equal(count, 9);
  assert.equal(locations.length, 9);
});

test('--flag reports the named flag across JS, native and JSON files', () => {
  const dir = fixture({
    'src/shell.ts': "export const value = readDemoFlag('demo-flag');\n",
    'ios/Shell.swift': 'let value = readDemoFlag()\n',
    'eas.json': '{ "env": { "DEMO_FLAG": "readDemoFlag" } }\n',
    'src/other.ts': 'export const other = 1;\n',
  });
  const { flagName } = inventory(dir, '--flag', 'readDemoFlag|demo-flag').signals;
  assert.equal(flagName.count, 3);
  assert.equal(flagName.fileCount, 3);
  assert.deepEqual(flagName.locations, ['eas.json:1', 'ios/Shell.swift:1', 'src/shell.ts:1']);
});

test('--flag reports count 0 once the flag is gone, and nothing when not asked', () => {
  const dir = fixture({ 'src/shell.ts': 'export const value = 1;\n' });
  const { flagName } = inventory(dir, '--flag', 'readDemoFlag').signals;
  assert.equal(flagName.count, 0);
  assert.deepEqual(flagName.locations, []);
  assert.equal(flagName.testOnly, false);
  assert.equal(inventory(dir).signals.flagName, undefined);
});

test('a missing or invalid option value exits 2 with usage rather than scanning', () => {
  const dir = fixture({ 'src/shell.ts': 'export const value = 1;\n' });
  for (const flags of [['--flag'], ['--flag', '('], ['--flag', '--max-locations', '5'], ['--max-locations', 'many']]) {
    const result = spawnSync(process.execPath, [script, dir, ...flags], { encoding: 'utf8' });
    assert.equal(result.status, 2, flags.join(' '));
    assert.match(result.stderr, /--max-locations N/);
  }
});

test('--help prints usage that explains both options', () => {
  const result = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--max-locations N .*truncated/);
  assert.match(result.stdout, /--flag <regex>/);
});

test('truncated is count minus locations, and --max-locations lowers or clears it', () => {
  const lines = Array.from({ length: 10 }, () => 'createStackNavigator();').join('\n');
  const dir = fixture({ 'src/nav.ts': lines });
  const key = 'react-navigation:js-stack';
  assert.equal(inventory(dir).signals[key].truncated, 2);
  assert.equal(inventory(dir, '--max-locations', '3').signals[key].truncated, 7);
  assert.equal(inventory(dir, '--max-locations', '200').signals[key].truncated, 0);
  assert.match(inventory(dir).note, /--max-locations 200/);
});

test('truncated ignores test-file hits, which never list as locations', () => {
  const { signals } = inventory(root);
  assert.equal(signals['back:prevent-remove'].truncated, 0);
  assert.equal(signals['react-navigation:imperative'].truncated, 0);
});

test('comment-only lines do not match, and code after a comment marker still does', () => {
  const dir = fixture({
    'src/nav.ts': [
      '// createDrawerNavigator();',
      '  // createDrawerNavigator();',
      '/* createDrawerNavigator(); */',
      '/**',
      ' * createDrawerNavigator();',
      ' */',
      'createDrawerNavigator(); // a real call',
    ].join('\n'),
    'ios/Scene.swift': '// UIWindowScene\n',
  });
  const output = inventory(dir);
  assert.deepEqual(output.signals['react-navigation:drawer'].locations, ['src/nav.ts:7']);
  assert.equal(output.nativeSignals['native:multi-window'], undefined);
});

test('importOnlyFileCount counts files whose only hits are import lines', () => {
  const dir = fixture({
    'src/one-line.tsx': "import { Host } from '@expo/ui/swift-ui';\nexport const a = 1;\n",
    'src/multi-line.tsx': "import {\n  Host,\n} from '@expo/ui/swift-ui';\nexport const b = 1;\n",
    'src/required.js': "const ui = require('@expo/ui/swift-ui');\n",
    'src/used.tsx': "const load = () => import('x');\nexport const c = load('@expo/ui/swift-ui');\n",
  });
  const signal = inventory(dir).signals['expo-ui:swift-ui'];
  assert.equal(signal.fileCount, 4);
  assert.equal(signal.importOnlyFileCount, 3);
});

test('new signals: private router imports, search, scene config, idiom layout', () => {
  const dir = fixture({
    'index.tsx': "import { ctx } from 'expo-router/build/internal';\nimport { Link } from 'expo-router';\n",
    'src/search.tsx': "<Stack.SearchBar />;\nconst tab = { role: 'other' };\n<Tab role=\"search\" />;\n",
    'plugin.js': "config.ios.infoPlist.UIApplicationSceneManifest = {};\n",
    'src/layout.ts': 'export const wide = Platform.isPad;\n',
    'ios/Shell.swift': [
      'Tab(role: .search) {}',
      'view.searchable(text: $text)',
      '@Environment(\\.horizontalSizeClass) var size',
      'let idiom = UIDevice.current.userInterfaceIdiom',
      'view.tabViewStyle(.sidebarAdaptable)',
      'view.toolbar(removing: .sidebarToggle)',
      'class Delegate: ExpoAppSceneDelegate {}',
      'UIApplication.shared.requestSceneSessionActivation(nil, userActivity: nil, options: nil)',
      'let scenes = UIApplication.shared.connectedScenes',
      'let activity = NSUserActivity(activityType: "demo")',
      'view.onDrag { provider }',
    ].join('\n'),
  });
  const { signals, nativeSignals } = inventory(dir);
  assert.deepEqual(signals['expo-router:private-import'].locations, ['index.tsx:1']);
  assert.equal(signals['expo-router:import'].count, 2);
  assert.equal(signals['nav:search'].count, 2);
  assert.deepEqual(signals['native:multi-window'].locations, ['plugin.js:1']);
  assert.deepEqual(signals['layout:width-driven'].locations, ['src/layout.ts:1']);
  assert.equal(nativeSignals['nav:search'].count, 2);
  assert.equal(nativeSignals['layout:width-driven'].count, 2);
  assert.equal(nativeSignals['native:swiftui-navigation'].count, 2);
  assert.equal(nativeSignals['native:multi-window'].count, 3);
  assert.equal(nativeSignals['native:deep-links'].count, 2);
});

test('app config keeps plugin options, platforms, infoPlist keys and deployment target', () => {
  const dir = fixture({
    'app.json': JSON.stringify({
      expo: {
        slug: 'demo',
        platforms: ['ios', 'web'],
        plugins: ['expo-font', ['expo-build-properties', { ios: { deploymentTarget: '16.4' } }]],
        ios: { infoPlist: { DemoKey: 'value', OtherKey: true } },
      },
    }),
  });
  const [config] = inventory(dir).appConfigs;
  assert.deepEqual(config.plugins, ['expo-font', 'expo-build-properties']);
  assert.deepEqual(config.pluginOptions, { 'expo-build-properties': { ios: { deploymentTarget: '16.4' } } });
  assert.deepEqual(config.platforms, ['ios', 'web']);
  assert.deepEqual(config.ios.infoPlistKeys, ['DemoKey', 'OtherKey']);
  assert.equal(config.ios.deploymentTarget, '16.4');
});

test('app config reads ios.deploymentTarget directly, and reports null when undeclared', () => {
  const direct = fixture({ 'app.json': JSON.stringify({ expo: { slug: 'demo', ios: { deploymentTarget: '17.0' } } }) });
  assert.equal(inventory(direct).appConfigs[0].ios.deploymentTarget, '17.0');
  const none = fixture({ 'app.json': JSON.stringify({ expo: { slug: 'demo' } }) });
  const [config] = inventory(none).appConfigs;
  assert.equal(config.ios.deploymentTarget, null);
  assert.equal(config.platforms, null);
  assert.deepEqual(config.ios.infoPlistKeys, []);
  assert.deepEqual(config.pluginOptions, {});
});

test('a postinstall script is reported, even on a package with no navigation dependency', () => {
  const dir = fixture({
    'package.json': JSON.stringify({ name: 'demo-root', scripts: { postinstall: 'node patch.js' } }),
    'tools/package.json': JSON.stringify({ name: 'demo-tool', scripts: { build: 'tsc' } }),
    'app/package.json': JSON.stringify({ name: 'demo-app', dependencies: { expo: '~55.0.0' } }),
  });
  const { packages } = inventory(dir);
  assert.deepEqual(packages.map((pkg) => [pkg.name, pkg.postinstall]), [
    ['demo-app', null],
    ['demo-root', 'node patch.js'],
  ]);
});

test('customEntries excludes local module entries, and modules report their platforms', () => {
  const dir = fixture({
    'index.tsx': 'export {};\n',
    'modules/alpha/expo-module.config.json': JSON.stringify({ platforms: ['apple'] }),
    'modules/alpha/index.ts': 'export {};\n',
    'modules/alpha/src/index.ts': 'export {};\n',
    'modules/beta/expo-module.config.json': '{}',
    'modules/beta/index.tsx': 'export {};\n',
    'modules/not-a-module/index.ts': 'export {};\n',
  });
  const { structure } = inventory(dir);
  assert.deepEqual(structure.customEntries, ['index.tsx', 'modules/not-a-module/index.ts']);
  assert.deepEqual(structure.localExpoModules, ['modules/alpha', 'modules/beta']);
  assert.deepEqual(structure.localModulePlatforms, { 'modules/alpha': ['apple'], 'modules/beta': null });
});

test('a module config at the repository root does not hide every entry', () => {
  const dir = fixture({
    'expo-module.config.json': JSON.stringify({ platforms: ['android'] }),
    'example/App.tsx': 'export {};\n',
  });
  const { structure } = inventory(dir);
  assert.deepEqual(structure.customEntries, ['example/App.tsx']);
  assert.deepEqual(structure.localModulePlatforms, { '.': ['android'] });
});
