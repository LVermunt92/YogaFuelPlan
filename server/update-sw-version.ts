import fs from 'fs';
import path from 'path';

/**
 * Automatically updates the service worker version to current timestamp
 * This ensures iOS PWAs and browsers detect new versions on every deployment
 */
export function updateServiceWorkerVersion(): void {
  try {
    const swPath = path.join(process.cwd(), 'client', 'public', 'sw.js');
    
    if (!fs.existsSync(swPath)) {
      console.warn('⚠️  Service worker file not found at:', swPath);
      return;
    }

    let swContent = fs.readFileSync(swPath, 'utf-8');
    
    // Generate version from current timestamp (unique for each deployment)
    const version = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Replace the SW_VERSION value
    const versionRegex = /const SW_VERSION = ["']([^"']+)["'];/;
    const newVersionLine = `const SW_VERSION = "${version}";`;
    
    if (versionRegex.test(swContent)) {
      const oldVersion = swContent.match(versionRegex)?.[1];
      swContent = swContent.replace(versionRegex, newVersionLine);
      fs.writeFileSync(swPath, swContent, 'utf-8');
      console.log(`🔄 Service worker version updated: ${oldVersion} → ${version}`);
    } else {
      console.warn('⚠️  Could not find SW_VERSION in service worker file');
    }
  } catch (error) {
    console.error('❌ Failed to update service worker version:', error);
  }
}
