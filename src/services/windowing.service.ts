/// <reference types="chrome" />

const DETACHED_URL = chrome.runtime.getURL('detached.html');
const MINI_URL = chrome.runtime.getURL('pip.html');

/**
 * Open (or focus) the detached popup window. There is only ever one.
 */
export async function openDetached(): Promise<void> {
  const existing = await findExistingDetached();
  if (existing && existing.id !== undefined) {
    await chrome.windows.update(existing.id, { focused: true });
    return;
  }
  await chrome.windows.create({
    url: DETACHED_URL,
    type: 'popup',
    width: 400,
    height: 660,
  });
}

/**
 * Open (or focus) the compact mini-window — a small Chrome popup window
 * showing just the timer. Serves as the persistent host that lets the
 * user upgrade to a true always-on-top PiP from inside it.
 */
export async function openMiniWindow(): Promise<void> {
  const existing = await findExistingMini();
  if (existing && existing.id !== undefined) {
    await chrome.windows.update(existing.id, { focused: true });
    return;
  }
  await chrome.windows.create({
    url: MINI_URL,
    type: 'popup',
    width: 300,
    height: 440,
    focused: true,
  });
}

async function findExistingMini(): Promise<chrome.windows.Window | null> {
  const all = await chrome.windows.getAll({ populate: true });
  for (const win of all) {
    if (win.type !== 'popup' || !win.tabs) continue;
    for (const t of win.tabs) {
      if (t.url && t.url.startsWith(MINI_URL)) return win;
    }
  }
  return null;
}

/**
 * Open Chrome's side panel for the active tab.
 */
export async function openSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.windowId === undefined) return;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch {
    // Chrome < 116 may reject — silently fall through.
  }
}

async function findExistingDetached(): Promise<chrome.windows.Window | null> {
  const all = await chrome.windows.getAll({ populate: true });
  for (const win of all) {
    if (win.type !== 'popup' || !win.tabs) continue;
    for (const t of win.tabs) {
      if (t.url && t.url.startsWith(DETACHED_URL)) return win;
    }
  }
  return null;
}
