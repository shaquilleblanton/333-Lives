const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withIosSpmFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      try {
        const rnPkg = require.resolve('react-native/package.json', {
          paths: [config.modRequest.projectRoot],
        });
        const rnRoot = path.dirname(rnPkg);
        const spmRbPath = path.join(rnRoot, 'scripts/cocoapods/spm.rb');

        if (!fs.existsSync(spmRbPath)) {
          console.warn('[withIosSpmFix] spm.rb not found at:', spmRbPath);
          return config;
        }

        let content = fs.readFileSync(spmRbPath, 'utf8');

        if (content.includes('# [withIosSpmFix] patched')) {
          console.log('[withIosSpmFix] spm.rb already patched, skipping');
          return config;
        }

        const before1 = 'add_spm_to_target(\n          project,\n          project.targets.find { |t| t.name == pod_name},';
        const after1 = 'spm_target__ = project.targets.find { |t| t.name == pod_name}\n        next if spm_target__.nil? # [withIosSpmFix] patched\n        add_spm_to_target(\n          project,\n          spm_target__,';

        const before2 = '        target = project.targets.find { |t| t.name == pod_name}\n        target.build_configurations.each';
        const after2 = '        target = project.targets.find { |t| t.name == pod_name}\n        next if target.nil? # [withIosSpmFix] patched\n        target.build_configurations.each';

        if (content.includes(before1)) {
          content = content.replace(before1, after1);
          console.log('[withIosSpmFix] Patched add_spm_to_target nil guard');
        } else {
          console.warn('[withIosSpmFix] Pattern 1 not found in spm.rb');
        }

        if (content.includes(before2)) {
          content = content.replace(before2, after2);
          console.log('[withIosSpmFix] Patched build_configurations nil guard');
        } else {
          console.warn('[withIosSpmFix] Pattern 2 not found in spm.rb');
        }

        fs.writeFileSync(spmRbPath, content);
        console.log('[withIosSpmFix] spm.rb patched successfully');
      } catch (e) {
        console.warn('[withIosSpmFix] Failed to patch spm.rb:', e.message);
      }

      return config;
    },
  ]);
};

module.exports = withIosSpmFix;
