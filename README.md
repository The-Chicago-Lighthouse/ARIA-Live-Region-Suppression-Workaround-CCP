# ARIA Live Region Suppression Workaround — Amazon Connect CCP

A browser-side Tampermonkey userscript that suppresses disruptive ARIA live region announcements in the Amazon Connect Contact Control Panel (CCP) for screen reader users.

---

## Background

Agents using screen readers experienced continuous, repetitive announcements from the CCP during live calls. These are triggered automatically by the AWS Cloudscape UI framework on call status updates, agent timers, and connection events — outside of standard Amazon Connect configuration options.

This workaround suppresses only the identified noisy regions without modifying the Connect platform, infrastructure, or licensing.

---

## What It Suppresses

| Target | `data-testid` | iframe | ARIA Attribute Removed |
|---|---|---|---|
| Softphone connection tabs (all) | `ccp-softphone-connectiontab-*` | `ccp-v2/channel-view` | `aria-live`, `aria-atomic` |
| Agent status timer | `ccp-header-agent-status-timer` | `ccp-v2/task-list` | `role="timer"` |
| Task row live regions | `task-list-task-row` | `ccp-v2/task-list` | `aria-live`, `aria-atomic`, `role` |

> The `*` wildcard covers `primary`, `thirdparty`, `thirdparty-1`, `thirdparty-2`, and any future variants added by Amazon Connect for multi-party calls. Tabs without a `MainBannerArea` element (e.g. `-close` tabs) are automatically skipped.

All other page regions, notifications, and accessibility features remain fully intact.

---

## Prerequisites

- **Browser:** Chrome or Edge (Chromium-based)
- **Extension:** [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) or [Tampermonkey for Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Developer Mode:** Must be enabled in `chrome://extensions` or `edge://extensions`

---

## Installation

### Manual (Single User)

1. Install Tampermonkey for your browser using the links above
2. Enable Developer Mode in your browser's extensions page
3. Click the Tampermonkey icon → **Create new script**
4. Replace the default content with the contents of [`suppress-aria-ccp.user.js`]
5. Save with `Ctrl+S`
6. Open Amazon Connect — suppression activates automatically

---

## Enterprise Deployment (Group Policy / GPO)

For managed environments, the script can be deployed silently to all agent workstations via GPO with no manual steps required per machine.

### Phase 1 — Force-Install Tampermonkey

**Chrome** — add to `ExtensionInstallForcelist` policy:
```
dhdgffkkebhmkfjojejmpbldmpobfkfo;https://clients2.google.com/service/update2/crx
```

**Edge** — add to `ExtensionInstallForcelist` policy:
```
iikmkjmpaadaobahmlepeloendndfphd;https://edge.microsoft.com/extensionwebstorebase/v1/crx
```

### Phase 2 — Enable Developer Mode via Registry

**Chrome:**
```
HKLM\SOFTWARE\Policies\Google\Chrome
Value: ExtensionDeveloperModeAllowed = 1 (REG_DWORD)
```

**Edge:**
```
HKLM\SOFTWARE\Policies\Microsoft\Edge
Value: ExtensionDeveloperModeAllowed = 1 (REG_DWORD)
```

### Phase 3 — Deploy the Userscript via Logon Script

1. Copy `suppress-aria-ccp.user.js` to your SYSVOL share:
   ```
   \\YourDomain\SYSVOL\YourDomain\scripts\suppress-aria-ccp.user.js
   ```

2. Deploy `deploy-tampermonkey-script.ps1` as a GPO logon script:
   ```
   User Configuration → Policies → Windows Settings → Scripts → Logon
   ```
   Script parameters:
   ```
   -ExecutionPolicy Bypass -File "\\YourDomain\SYSVOL\YourDomain\scripts\deploy-tampermonkey-script.ps1"
   ```

The PowerShell script copies the userscript into Tampermonkey's local storage folder for both Chrome and Edge on each agent login. Updates to the script on SYSVOL are automatically picked up on next login.

---

## Files

```
├── suppress-aria-ccp.user.js          # The Tampermonkey userscript
├── deploy-tampermonkey-script.ps1     # GPO logon script for enterprise deployment
└── README.md                          # This file
```

---

## How It Works

The script uses a two-stage approach to reliably suppress ARIA attributes inside CCP iframes:

1. **Direct iframe injection** — Tampermonkey matches the CCP iframe URLs directly (`/ccp-v2/channel-view` and `/ccp-v2/task-list`), so `unsafeWindow.document` is already the correct iframe document with no cross-frame traversal needed

2. **MutationObserver** — Amazon Connect is a React single-page app that continuously re-renders components and restores ARIA attributes. A `MutationObserver` watches for DOM changes and re-applies suppression each time React re-renders the targeted elements

---

## Updating the Script

To add or change suppression targets:

1. Identify which iframe the element lives in using the browser console:
   ```javascript
   const ccpDoc = document.querySelector('#ccp-container iframe').contentDocument;
   const taskDoc = document.querySelector('#ccp-task-container iframe').contentDocument;
   console.log(ccpDoc.querySelector('[data-testid="your-target"]'));
   console.log(taskDoc.querySelector('[data-testid="your-target"]'));
   ```

2. Inspect the element's `outerHTML` to identify which ARIA attributes to remove

3. Add a new target block inside `suppress()` under the correct `isChannelView` or `isTaskList` condition in `suppress-aria-ccp.user.js`

4. Bump the `@version` number in the script header

5. Update the file on SYSVOL — agents will receive the update automatically on next login

---

## Compatibility

| Environment | Status |
|---|---|
| Chrome + Tampermonkey | ✅ Tested |
| Edge + Tampermonkey | ✅ Tested |
| Amazon Connect CCP v2 | ✅ Tested |
| Firefox + Tampermonkey | ⚠️ Not tested |
| Safari | ❌ Not supported |

> **Note:** Amazon Connect UI updates may occasionally alter `data-testid` attributes or component class names. If suppression stops working after a Connect update, re-inspect the affected elements using the browser console and update the selectors accordingly.

---

## Limitations

- Requires Tampermonkey and Developer Mode to be enabled on each agent browser
- Tested on Chrome and Edge only
- `MainBannerArea` class name prefix may change between Cloudscape build versions — the script uses a substring match (`[class*="MainBannerArea"]`) to handle this
- Not a platform-level fix — this is a client-side workaround pending a native Amazon Connect accessibility improvement

---

## License

MIT
