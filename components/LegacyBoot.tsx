'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function loadScript(src, type) {
  return new Promise((resolve, reject) => {
    const selector = type === 'module'
      ? `script[type="module"][src="${src}"]`
      : `script[src="${src}"]`;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const s = document.createElement('script');
    if (type) s.type = type;
    s.src = src;
    s.async = true;
    s.addEventListener('load', () => {
      s.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.body.appendChild(s);
  });
}

async function bootLegacyApp() {
  if (typeof window.__paBootPortfolioApp !== 'function') {
    await loadScript('/js/main.js', 'module');
  }
  if (typeof window.__paBootPortfolioApp !== 'function') {
    throw new Error('Legacy boot API not available after loading main.js');
  }
  return window.__paBootPortfolioApp();
}

function teardownLegacyApp() {
  window.__paTeardownPortfolioApp?.();
}

/**
 * Client-only boot hook for the legacy vanilla module system.
 * Re-boots on every Next.js route change so the dashboard loads data correctly.
 */
export default function LegacyBoot({ authBody = false, needsCanvasJs = false }) {
  const pathname = usePathname();
  const bootIdRef = useRef(0);

  useLayoutEffect(() => {
    if (authBody) return;
    window.__paEnsureBodyLoader?.(true, 'Loading your data…');
  }, [authBody, pathname]);

  useEffect(() => {
    const bootId = ++bootIdRef.current;
    let cancelled = false;

    async function run() {
      if (authBody) {
        document.documentElement.classList.add('pa-auth-route');
        document.body.classList.add('pa-auth-body');
      }

      if (needsCanvasJs && typeof window.ApexCharts === 'undefined') {
        await loadScript('/js/vendor/apexcharts.min.js');
      }
      if (cancelled || bootId !== bootIdRef.current) return;

      await bootLegacyApp();
    }

    run().catch((err) => {
      console.error('[LegacyBoot] boot failed:', err);
    });

    return () => {
      cancelled = true;
      teardownLegacyApp();
      document.documentElement.classList.remove('pa-auth-route');
      if (authBody) document.body.classList.remove('pa-auth-body');
    };
  }, [authBody, needsCanvasJs, pathname]);

  return null;
}
