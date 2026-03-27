// ==UserScript==
// @name         Suppress ARIA - CCP Softphone Tab & Task Row
// @namespace    http://tampermonkey.net/
// @version      4.1
// @match        *://*.connect.aws/ccp-v2/channel-view/*
// @match        *://*.my.connect.aws/ccp-v2/channel-view/*
// @match        *://*.connect.aws/ccp-v2/task-list*
// @match        *://*.my.connect.aws/ccp-v2/task-list*
// @match        *://*.novelvox.net/chicagolighthouse*
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const log = (msg) => console.warn('[ARIA Suppress v4.1]', msg);
  const path = unsafeWindow.location.pathname;
  const isChannelView = path.includes('/ccp-v2/channel-view');
  const isTaskList = path.includes('/ccp-v2/task-list');

  const suppress = () => {

    if (isChannelView) {
      // Target 1: MainBannerArea live region inside softphone tab
      const softphone = unsafeWindow.document.querySelector('[data-testid="ccp-softphone-connectiontab-primary"]');
      if (softphone) {
        const liveRegion = softphone.querySelector('[class*="MainBannerArea"]');
        if (liveRegion) {
          liveRegion.removeAttribute('aria-live');
          liveRegion.removeAttribute('aria-atomic');
          liveRegion.setAttribute('aria-hidden', 'true');
          log('✅ Suppressed MainBannerArea');
        }
      }
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

      // Target 3: Agent status timer inside ccp-header-agent-status-timer
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