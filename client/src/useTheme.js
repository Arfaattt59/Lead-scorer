import { useEffect, useState } from 'react';

const KEY = 'leadscorer-theme';
const DARK = '(prefers-color-scheme: dark)';

// 'system' follows the OS; 'light' or 'dark' is a manual choice kept in this browser only.
export function readPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'light' || pref === 'dark') root.setAttribute('data-theme', pref);
  else root.removeAttribute('data-theme');
}

export function useThemePref() {
  const [pref, setPref] = useState(readPref);
  useEffect(() => {
    applyTheme(pref);
    try {
      if (pref === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref);
    } catch { /* storage blocked: the choice just lasts for this visit */ }
  }, [pref]);
  return [pref, setPref];
}

// The theme actually showing, for components (SpotlightCard) that need an explicit light or dark.
export function useResolvedTheme() {
  const get = () => document.documentElement.getAttribute('data-theme')
    ?? (window.matchMedia?.(DARK).matches ? 'dark' : 'light');
  const [theme, setTheme] = useState(get);
  useEffect(() => {
    const update = () => setTheme(get());
    const mq = window.matchMedia?.(DARK);
    mq?.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq?.removeEventListener('change', update); obs.disconnect(); };
  }, []);
  return theme;
}
