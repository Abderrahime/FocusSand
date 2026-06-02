import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'FocusSand',
  version: pkg.version,
  description:
    'Gérez vos tâches du jour avec un timer visuel élégant et restez focus.',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'index.html',
    default_title: 'FocusSand',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  // Only `tabs` is needed for distraction detection (it reads tab URLs).
  // No broad host permissions — keeps the Web Store review simple.
  permissions: ['storage', 'notifications', 'alarms', 'tabs', 'sidePanel'],
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
