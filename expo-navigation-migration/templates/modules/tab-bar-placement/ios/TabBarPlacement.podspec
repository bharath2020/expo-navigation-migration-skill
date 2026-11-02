Pod::Spec.new do |s|
  s.name           = 'TabBarPlacement'
  s.version        = '1.0.0'
  s.summary        = 'SwiftUI defaultTabBarPlacement as an @expo/ui modifier'
  s.author         = ''
  s.homepage       = 'https://github.com/expo/expo'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoUI'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.swift"
end
