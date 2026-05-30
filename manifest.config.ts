import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'FocusSand',
  version: pkg.version,
  description:
    'Gérez vos tâches du jour avec un timer visuel élégant et restez focus.',
  action: {
    default_popup: 'index.html',
    default_title: 'FocusSand',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  permissions: ['storage', 'notifications', 'alarms', 'tabs', 'sidePanel'],
  host_permissions: [
    '*://*.youtube.com/*',
    '*://*.facebook.com/*',
    '*://*.instagram.com/*',
    '*://*.tiktok.com/*',
    '*://*.netflix.com/*',
    '*://*.x.com/*',
  ],
  side_panel: {
    default_path: 'side-panel.html',
  },
  web_accessible_resources: [
    {
      resources: ['detached.html', 'pip.html'],
      matches: ['<all_urls>'],
    },
  ],
});
