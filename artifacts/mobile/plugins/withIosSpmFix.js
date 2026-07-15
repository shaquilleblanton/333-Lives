const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const STUBS = {
  'ClerkExpoModule.swift': `
import ExpoModulesCore
import Foundation

public class ClerkExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClerkExpo")
  }
}
`.trim(),
  'ClerkNativeBridge.swift': `import Foundation`,
  'ClerkAuthNativeView.swift': `import Foundation`,
  'ClerkNativeViewHost.swift': `import Foundation`,
  'ClerkUserButtonNativeView.swift': `import Foundation`,
  'ClerkUserProfileNativeView.swift': `import Foundation`,
  'ClerkGoogleSignInModule.swift': `
import ExpoModulesCore
import Foundation

public class ClerkGoogleSignInModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClerkGoogleSignIn")
  }
}
`.trim(),
};

const withIosSpmFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      try {
        const clerkExpoPkg = require.resolve('@clerk/expo/package.json', {
          paths: [config.modRequest.projectRoot],
        });
        const iosDir = path.join(path.dirname(clerkExpoPkg), 'ios');

        for (const [file, stub] of Object.entries(STUBS)) {
          const filePath = path.join(iosDir, file);
          if (fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, stub + '\n');
            console.log(`[withIosSpmFix] Stubbed ${file}`);
          }
        }

        const podspecPath = path.join(iosDir, 'ClerkExpo.podspec');
        if (fs.existsSync(podspecPath)) {
          let spec = fs.readFileSync(podspecPath, 'utf8');
          if (!spec.includes('# [withIosSpmFix]')) {
            spec = spec
              .replace(/s\.static_framework\s*=\s*true/, '# s.static_framework = true # [withIosSpmFix]')
              .replace(/if defined\?\(spm_dependency\)[\s\S]*?end/m,
                '# spm_dependency removed by withIosSpmFix');
            fs.writeFileSync(podspecPath, spec);
            console.log('[withIosSpmFix] Patched ClerkExpo.podspec');
          }
        }
      } catch (e) {
        console.warn('[withIosSpmFix] Error:', e.message);
      }

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
        console.warn('[withIosSpmFix] spm.rb patch failed:', e.message);
      }

      return config;
    },
  ]);
};

module.exports = withIosSpmFix;
