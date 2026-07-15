const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SWIFT_STUBS = {
  'ClerkExpoModule.swift': `import ExpoModulesCore
import Foundation

public class ClerkExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClerkExpo")
  }
}`,
  'ClerkNativeBridge.swift': `import Foundation`,
  'ClerkAuthNativeView.swift': `import Foundation`,
  'ClerkNativeViewHost.swift': `import Foundation`,
  'ClerkUserButtonNativeView.swift': `import Foundation`,
  'ClerkUserProfileNativeView.swift': `import Foundation`,
  'ClerkGoogleSignInModule.swift': `import ExpoModulesCore
import Foundation

public class ClerkGoogleSignInModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClerkGoogleSignIn")
  }
}`,
};

// Complete replacement podspec — no SPM dependencies, no static_framework
const CLEAN_PODSPEC = `require 'json'

package_json_path = File.join(__dir__, '..', 'package.json')
package_json_path = File.join(File.readlink(__dir__), '..', 'package.json') if File.symlink?(__dir__)

if File.exist?(package_json_path)
  package = JSON.parse(File.read(package_json_path))
else
  package = {
    'version' => '0.0.0-FALLBACK',
    'description' => 'Clerk React Native/Expo library',
    'license' => 'MIT',
    'author' => 'Clerk',
    'homepage' => 'https://clerk.com/'
  }
end

Pod::Spec.new do |s|
  s.name           = 'ClerkExpo'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.10'
  s.source         = { git: 'https://github.com/clerk/javascript' }

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "ClerkNativeBridge.swift",
                   "ClerkExpoModule.swift",
                   "ClerkNativeViewHost.swift",
                   "ClerkAuthNativeView.swift",
                   "ClerkUserProfileNativeView.swift",
                   "ClerkUserButtonNativeView.swift"

  install_modules_dependencies(s)
end
`;

const withIosSpmFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      try {
        const clerkExpoPkg = require.resolve('@clerk/expo/package.json', {
          paths: [config.modRequest.projectRoot],
        });
        const iosDir = path.join(path.dirname(clerkExpoPkg), 'ios');

        // Stub Swift source files
        for (const [file, stub] of Object.entries(SWIFT_STUBS)) {
          const filePath = path.join(iosDir, file);
          if (fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, stub + '\n');
            console.log(`[withIosSpmFix] Stubbed ${file}`);
          }
        }

        // Replace podspec entirely with clean version (no SPM, no static_framework)
        const podspecPath = path.join(iosDir, 'ClerkExpo.podspec');
        if (fs.existsSync(podspecPath)) {
          fs.writeFileSync(podspecPath, CLEAN_PODSPEC);
          console.log('[withIosSpmFix] Replaced ClerkExpo.podspec');
        }
      } catch (e) {
        console.warn('[withIosSpmFix] ClerkExpo patch error:', e.message);
      }

      // Keep spm.rb nil-guard patch as safety net
      try {
        const rnPkg = require.resolve('react-native/package.json', {
          paths: [config.modRequest.projectRoot],
        });
        const spmRbPath = path.join(path.dirname(rnPkg), 'scripts/cocoapods/spm.rb');
        if (fs.existsSync(spmRbPath)) {
          let content = fs.readFileSync(spmRbPath, 'utf8');
          if (!content.includes('# [withIosSpmFix]')) {
            content = content
              .replace(
                'add_spm_to_target(\n          project,\n          project.targets.find { |t| t.name == pod_name},',
                'spm_t__ = project.targets.find { |t| t.name == pod_name}\n        next if spm_t__.nil? # [withIosSpmFix]\n        add_spm_to_target(\n          project,\n          spm_t__,'
              )
              .replace(
                '        target = project.targets.find { |t| t.name == pod_name}\n        target.build_configurations.each',
                '        target = project.targets.find { |t| t.name == pod_name}\n        next if target.nil? # [withIosSpmFix]\n        target.build_configurations.each'
              );
            fs.writeFileSync(spmRbPath, content);
            console.log('[withIosSpmFix] Patched spm.rb');
          }
        }
      } catch (e) {
        console.warn('[withIosSpmFix] spm.rb patch error:', e.message);
      }

      return config;
    },
  ]);
};

module.exports = withIosSpmFix;
