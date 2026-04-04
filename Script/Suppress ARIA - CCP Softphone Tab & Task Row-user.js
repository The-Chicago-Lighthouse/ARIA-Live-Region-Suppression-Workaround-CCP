// ==UserScript==
// @name         Suppress ARIA - CCP Softphone Tab & Task Row
// @namespace    http://tampermonkey.net/
// @version      5.0
// @match        *://*.connect.aws/ccp-v2/channel-view/*
// @match        *://*.my.connect.aws/ccp-v2/channel-view/*
// @match        *://*.connect.aws/ccp-v2/task-list*
// @match        *://*.my.connect.aws/ccp-v2/task-list*
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const log = (msg) => console.warn('[ARIA Suppress v5.0]', msg);
  const path = unsafeWindow.location.pathname;
  const isChannelView = path.includes('/ccp-v2/channel-view');
  const isTaskList = path.includes('/ccp-v2/task-list');

  // Extract status-only text from the banner innerText
  // Banner format: "<phone>\n\n<MM:SS>\n\n<N minutes N seconds>\n<Status text>"
  // We want only the last non-empty, non-timer line
  const extractStatus = (banner) => {
    return banner.innerText.trim().split('\n')
      .map(l => l.trim())
      .filter(l =>
        l &&
        !/^\+?[\d\s\-()]+$/.test(l) &&   // skip phone numbers
        !/^\d{1,2}:\d{2}$/.test(l) &&     // skip MM:SS timer
        !/^\d+ minutes?/.test(l)           // skip "N minutes N seconds"
      )
      .pop() || '';                         // take last remaining line = status
  };

  const attachBannerRedirect = (tab) => {
    const banner = tab.querySelector('[class*="MainBannerArea"]');
    if (!banner) return;
    if (banner.dataset.ariaRedirectAttached) return;
    banner.dataset.ariaRedirectAttached = 'true';

    // Step 1 — silence the noisy original live region
    banner.removeAttribute('aria-live');
    banner.removeAttribute('aria-atomic');
    log('🔇 Silenced MainBannerArea in: ' + tab.getAttribute('data-testid'));

    // Step 2 — inject a clean status-only announcer next to the banner
    const announcer = unsafeWindow.document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';
    tab.appendChild(announcer);

    // Announce the current status immediately on attach
    const initialStatus = extractStatus(banner);
    if (initialStatus) {
      announcer.textContent = initialStatus;
      log('📢 Initial status: ' + initialStatus);
    }

    // Step 3 — watch for status changes only, ignore timer ticks
    let lastStatus = initialStatus;
    new MutationObserver(() => {
      const status = extractStatus(banner);
      if (status && status !== lastStatus) {
        lastStatus = status;
        // Reset then set on next frame to force screen reader re-announcement
        announcer.textContent = '';
        requestAnimationFrame(() => {
          announcer.textContent = status;
          log('📢 Status changed: ' + status);
        });
      }
    }).observe(banner, { childList: true, subtree: true, characterData: true });
  };

  const suppress = () => {
    if (isChannelView) {
      // Process all connection tabs — primary, thirdparty, thirdparty-1, etc.
      unsafeWindow.document.querySelectorAll('[data-testid^="ccp-softphone-connectiontab-"]')
        .forEach(tab => attachBannerRedirect(tab));
    }

    if (isTaskList) {
      // Target 2: Live regions inside task rows
      unsafeWindow.document.querySelectorAll('[data-testid="task-list-task-row"]').forEach(row => {
        row.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')
          .forEach(el => {
            el.removeAttribute('aria-live');
            el.removeAttribute('aria-atomic');
            el.removeAttribute('role');
            el.setAttribute('aria-hidden', 'true');
            log('✅ Suppressed task-row live region');
          });
      });

      // Target 3: Agent status timer
      const timerContainer = unsafeWindow.document.querySelector('[data-testid="ccp-header-agent-status-timer"]');
      if (timerContainer) {
        const timerSpan = timerContainer.querySelector('[role="timer"]');
        if (timerSpan) {
          timerSpan.removeAttribute('role');
          timerSpan.setAttribute('aria-hidden', 'true');
          log('✅ Suppressed agent status timer');
        }
      }
    }
  };

  suppress();
  const observer = new MutationObserver(() => suppress());
  observer.observe(unsafeWindow.document.documentElement, { childList: true, subtree: true });

})();