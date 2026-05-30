import { useCallback, useEffect, useState } from 'react';

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

function getDPiP(): DocumentPictureInPicture | null {
  return (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture })
    .documentPictureInPicture ?? null;
}

/**
 * Document Picture-in-Picture lifecycle.
 *
 * Strategy: we open a PiP window and inject an iframe pointing to
 * `pip.html`. The iframe boots its own React tree, so the mini-window
 * keeps running even after the parent popup closes — its only link to
 * the rest of the app is `chrome.storage.local`.
 */
export function usePictureInPicture() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isSupported = typeof window !== 'undefined' && getDPiP() !== null;

  const open = useCallback(async (width = 280, height = 380): Promise<Window | null> => {
    const dpip = getDPiP();
    if (!dpip) {
      console.warn('[FocusSand] documentPictureInPicture API not available');
      return null;
    }

    if (dpip.window) {
      setPipWindow(dpip.window);
      return dpip.window;
    }

    const win = await dpip.requestWindow({ width, height });

    // If Chrome destroys the PiP before we can wire it up (e.g. opener
    // closed during the await), bail and report failure.
    if (!win || win.closed) {
      throw new Error('PiP window was closed immediately after creation');
    }

    win.document.documentElement.style.height = '100%';
    win.document.body.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;background:#f6f5f1;';

    const iframe = win.document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('pip.html');
    iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
    iframe.setAttribute('allow', 'autoplay');
    win.document.body.appendChild(iframe);

    win.addEventListener('pagehide', () => setPipWindow(null));
    setPipWindow(win);
    return win;
  }, []);

  const close = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  useEffect(() => {
    if (!pipWindow) return;
    const onPageHide = () => setPipWindow(null);
    pipWindow.addEventListener('pagehide', onPageHide);
    return () => pipWindow.removeEventListener('pagehide', onPageHide);
  }, [pipWindow]);

  return { pipWindow, open, close, isSupported };
}
