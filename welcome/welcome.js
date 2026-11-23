// @ts-check
/**
 * Welcome page: whether the "how to pin" block is shown in full or folded into one line, and
 * in which language (docs/ARCHITECTURE.md §17, EDGE_CASES W3–W7, W11, W12, W17, W24).
 *
 * One page, two blocks: #pin and #usage. Mode "pin" — both in full, pinning first; "usage" —
 * #pin is the line "✓ Icon pinned…" with a link to unfold it. #usage is always there, so
 * nobody has to go anywhere else to learn how to use the extension.
 *
 * Mode priority: the user's own choice ("Show how to pin it", #pin) > the extension's live
 * answer > the ?pinned= hint from the link > "pin". The extension is asked
 * `{type: 'getPinState'}` every 1.5 s while the tab is visible, for 10 minutes; after that
 * only once each time the tab becomes visible again, so a forgotten tab does not keep the
 * service worker awake all day.
 *
 * A change the user did not make (the icon got pinned or unpinned while the page is open)
 * never moves what they are reading: the scroll is corrected so that the block they are on
 * stays where it was on the screen (W24, W25; see scrollCorrection). The browser's own scroll
 * anchoring is off (welcome.css), just in case, so that one mechanism decides.
 *
 * A plain script, not a module: modules do not load from file://. No imports from the
 * product — Form Filler copies this folder (with ../shared/count.js) and changes only
 * constants, texts and pictures.
 * Nothing from the link is ever written into the page; texts go in with textContent.
 *
 * The one request to another server is the install counter (countInstall), sent by the
 * site's shared counter ../shared/count.js, loaded just before this script: off while
 * body[data-posthog-key] is empty, anywhere but the published site, and in an automated
 * browser. The page itself works without it (and without the shared folder).
 */
(function () {
  'use strict';

  const POLL_MS = 1500;
  const POLL_FOR_MS = 10 * 60 * 1000;
  const EXTENSION_ID = /^[a-p]{32}$/;
  const LANGUAGE_TAG = /^[a-z]{2,3}([-_][a-z0-9]{1,8})*$/i;
  /** Languages with texts (strings.js) and pictures (img/<lang>/); others get English. */
  const LANGUAGES = ['en', 'ru'];

  /** @typedef {'pin' | 'usage'} Mode */
  /**
   * The part of chrome.runtime the page uses. It exists on this page only because the
   * extension lists the site in externally_connectable.
   * @typedef {{
   *   lastError?: unknown,
   *   sendMessage: (id: string, message: unknown, callback: (reply: unknown) => void) => void
   * }} Runtime
   */

  /**
   * `hl` is the extension's UI language (the one its panel speaks); without a usable one —
   * the browser's language; a language without texts — English.
   * @param {string | null} hl
   * @param {string | undefined} browserLanguage
   */
  function pickLanguage(hl, browserLanguage) {
    const tag = hl !== null && LANGUAGE_TAG.test(hl) ? hl : browserLanguage || '';
    const primary = tag.toLowerCase().split(/[-_]/)[0] || '';
    return LANGUAGES.includes(primary) ? primary : 'en';
  }

  /**
   * The ID from the link (a developer-mode install has its own), else the store's.
   * Anything not shaped like an extension ID is ignored (W7).
   * @param {string | null} fromLink
   * @param {string | undefined} fromStore
   */
  function pickExtensionId(fromLink, fromStore) {
    if (fromLink !== null && EXTENSION_ID.test(fromLink)) return fromLink;
    if (fromStore !== undefined && EXTENSION_ID.test(fromStore)) return fromStore;
    return null;
  }

  /**
   * `{isOnToolbar: boolean}` or nothing: null, an unknown state and junk change nothing (W4).
   * @param {unknown} reply
   * @returns {boolean | null}
   */
  function readPinned(reply) {
    if (typeof reply !== 'object' || reply === null || !('isOnToolbar' in reply)) return null;
    return typeof reply.isOnToolbar === 'boolean' ? reply.isOnToolbar : null;
  }

  /** @returns {Runtime | null} */
  function findRuntime() {
    const chromeObject = /** @type {{ chrome?: unknown }} */ (/** @type {unknown} */ (window))
      .chrome;
    if (typeof chromeObject !== 'object' || chromeObject === null) return null;
    if (!('runtime' in chromeObject)) return null;
    const runtime = chromeObject.runtime;
    if (typeof runtime !== 'object' || runtime === null) return null;
    if (!('sendMessage' in runtime) || typeof runtime.sendMessage !== 'function') return null;
    return /** @type {Runtime} */ (runtime);
  }

  /** @param {string} language @returns {Record<string, unknown> | null} */
  function stringsFor(language) {
    const all = /** @type {{ WELCOME_STRINGS?: unknown }} */ (/** @type {unknown} */ (window))
      .WELCOME_STRINGS;
    if (typeof all !== 'object' || all === null || !(language in all)) return null;
    const table = /** @type {Record<string, unknown>} */ (all)[language];
    return typeof table === 'object' && table !== null
      ? /** @type {Record<string, unknown>} */ (table)
      : null;
  }

  /**
   * English is the markup itself; another language replaces texts, alts and pictures.
   * @param {string} language
   */
  function applyLanguage(language) {
    if (language === 'en') return;
    const strings = stringsFor(language);
    if (!strings) return; // no table — the page stays English as a whole, not half-translated
    document.documentElement.lang = language;
    for (const element of document.querySelectorAll('[data-i18n]')) {
      const text = strings[element.getAttribute('data-i18n') || ''];
      if (typeof text === 'string') element.textContent = text;
    }
    for (const element of document.querySelectorAll('[data-i18n-alt]')) {
      const text = strings[element.getAttribute('data-i18n-alt') || ''];
      if (typeof text === 'string') element.setAttribute('alt', text);
    }
    const prefix = 'img/' + language + '/';
    for (const element of document.querySelectorAll('img[src^="img/en/"]')) {
      element.setAttribute('src', prefix + (element.getAttribute('src') || '').slice(7));
    }
    for (const element of document.querySelectorAll('source[srcset^="img/en/"]')) {
      element.setAttribute('srcset', prefix + (element.getAttribute('srcset') || '').slice(7));
    }
  }

  /**
   * How far to scroll after a fold or unfold, so that what the user reads stays put (W24, W25).
   * Tops are on-screen (getBoundingClientRect), before and after the change. The browser clamps
   * the result at the top of the page (why a fold just under the top cannot keep #usage, W26).
   *
   * Fold ("pin" -> "usage"):
   * - Some of #usage is on the screen, or the user is past it: #usage keeps its place.
   * - Only #pin and what is above it are on the screen, and #pin starts above the screen:
   *   bring the top of #pin (the "✓" line) back into view.
   * - Otherwise nothing moves: the change is right under the user's eyes, as it should be.
   *
   * Unfold ("usage" -> "pin", the icon got unpinned):
   * - The "✓" line is on the screen (or below it): the steps appear right where it was, so
   *   the top of #pin keeps its place; at the very top of the page nothing moves at all, so
   *   the header stays whole. Holding #usage instead would push the new steps off the top.
   * - The "✓" line is above the screen, the user reads #usage: #usage keeps its place.
   * @param {{ mode: Mode, scrollY: number, pinBefore: number, pinAfter: number,
   *   usageBefore: number, usageAfter: number, viewport: number }} tops
   */
  function scrollCorrection(tops) {
    const { mode, scrollY, pinBefore, pinAfter, usageBefore, usageAfter, viewport } = tops;
    if (mode === 'pin') {
      if (pinBefore < 0) return usageAfter - usageBefore;
      return scrollY <= 0 ? 0 : pinAfter - pinBefore;
    }
    if (usageBefore < viewport) return usageAfter - usageBefore;
    if (pinAfter < 0) return pinAfter - 16;
    return 0;
  }

  /** @param {Mode} mode */
  function setTitle(mode) {
    const title = document.querySelector('h1 .when-' + mode);
    if (title && title.textContent) document.title = title.textContent;
  }

  /**
   * Tells a screen reader that #pin folded (or clears the message when it unfolds). The
   * region is always in the page, so a change in it is read out; it gets only the short
   * "Icon pinned…" — the folded line itself would be read with its link (R16-13).
   * @param {Mode} mode
   */
  function announce(mode) {
    const region = document.querySelector('[data-announce]');
    if (!region) return;
    const text = document.querySelector('#pin .pinned-text');
    region.textContent = mode === 'usage' && text ? text.textContent : '';
  }

  /**
   * Keyboard focus inside the part of #pin that has just been hidden would drop to <body>;
   * it goes to the part shown in its place instead (R16-14).
   * @param {HTMLElement} pin
   * @param {Mode} mode the mode just shown
   */
  function keepFocus(pin, mode) {
    const active = document.activeElement;
    const hidden = mode === 'pin' ? '.when-usage' : '.when-pin';
    if (!(active instanceof Element) || !pin.contains(active) || !active.closest(hidden)) return;
    const shown = pin.querySelector(mode === 'pin' ? '.pin-steps' : '.pinned-help a');
    if (shown instanceof HTMLElement) shown.focus({ preventScroll: true });
  }

  /**
   * Folds or unfolds #pin without moving what the user is reading. `live`: the change came
   * from the extension while the page is open, so a screen reader is told; the mode the
   * page opens in is not announced — the page itself is read then.
   * @param {Mode} mode
   * @param {boolean} live
   */
  function showMode(mode, live) {
    if (document.body.dataset.mode === mode) return;
    const pin = document.getElementById('pin');
    const usage = document.getElementById('usage');
    const usageBefore = usage ? usage.getBoundingClientRect().top : 0;
    const pinBefore = pin ? pin.getBoundingClientRect().top : 0;
    const scrolledBefore = window.scrollY;
    document.body.dataset.mode = mode;
    setTitle(mode);
    if (live) announce(mode);
    if (pin) keepFocus(pin, mode);
    if (!pin || !usage) return;
    const dy = scrollCorrection({
      mode,
      scrollY: scrolledBefore,
      pinBefore,
      pinAfter: pin.getBoundingClientRect().top,
      usageBefore,
      usageAfter: usage.getBoundingClientRect().top,
      viewport: window.innerHeight,
    });
    if (dy !== 0) window.scrollBy(0, dy);
  }

  const params = new URLSearchParams(location.search);
  const runtime = findRuntime();
  const extensionId = pickExtensionId(params.get('id'), document.body.dataset.storeId);
  /** The user picked a mode by hand: from now on nothing switches it (W12). */
  let chosen = false;
  /** False once the extension did not answer: not installed, disabled, another ID (W6, W7). */
  let reachable = runtime !== null && extensionId !== null;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let pollTimer;

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }

  function giveUp() {
    reachable = false;
    stopPolling();
  }

  function askExtension() {
    if (chosen || !reachable || !runtime || !extensionId) return;
    // A hidden tab never wakes the service worker (W11).
    if (document.visibilityState !== 'visible') return;
    try {
      runtime.sendMessage(extensionId, { type: 'getPinState' }, (reply) => {
        // Reading lastError also keeps Chrome from logging "Unchecked runtime.lastError".
        if (runtime.lastError) {
          giveUp();
          return;
        }
        const pinned = readPinned(reply);
        if (!chosen && pinned !== null) showMode(pinned ? 'usage' : 'pin', true);
      });
    } catch {
      giveUp(); // e.g. an ID Chrome refuses outright
    }
  }

  /**
   * "Show how to pin it": the user unfolds #pin by hand. The link is on the folded line,
   * so #pin unfolds right where they clicked; nothing switches it back afterwards (W12).
   */
  function chooseToPin() {
    chosen = true;
    stopPolling();
    const pin = document.getElementById('pin');
    const top = pin ? pin.getBoundingClientRect().top : 0;
    document.body.dataset.mode = 'pin';
    setTitle('pin');
    announce('pin');
    if (pin) window.scrollBy(0, pin.getBoundingClientRect().top - top);
    const steps = document.querySelector('#pin .pin-steps');
    if (steps instanceof HTMLElement) steps.focus({ preventScroll: true });
  }

  /**
   * The install counter (Daniil, 2026-11-02; 18D: on the site's shared counter). One
   * "extension_installed" event, only when the extension itself opened the page (a well-formed
   * ID in the link) — a visitor who just came to the site is not an install. Only what the
   * link already says: Chrome's language and whether the icon is pinned, plus the mode shown;
   * never the ID, the address or the referrer. Everything else is ../shared/count.js: it
   * sends only on the published site with a key and never in an automated browser, and its
   * distinct_id is the site's le_id — the same one the uninstall page and /feedback/ send, so
   * a person's install, rating and removal line up (ARCHITECTURE.md §18, U5, U6). The mark in
   * sessionStorage keeps a reload from counting twice. No count.js (a copy without the shared
   * folder) — no count; whatever goes wrong, the page works as before.
   */
  function countInstall() {
    const site = /** @type {{ LinkExtractorSite?: LinkExtractorSite }} */ (
      /** @type {unknown} */ (window)
    ).LinkExtractorSite;
    const fromLink = params.get('id');
    if (!site || fromLink === null || !EXTENSION_ID.test(fromLink)) return;
    const hl = params.get('hl');
    const pinned = params.get('pinned');
    /** @type {Record<string, unknown>} */
    const properties = { mode: document.body.dataset.mode };
    if (hl !== null && LANGUAGE_TAG.test(hl)) properties.chrome_language = hl;
    if (pinned === '1' || pinned === '0') properties.pinned = pinned === '1';
    site.sendOnce('installCounted', 'extension_installed', properties);
  }

  applyLanguage(pickLanguage(params.get('hl'), navigator.language));

  // #pin is the user's own choice, kept across a reload. #usage is only an anchor: the
  // browser scrolls to the block, the mode is decided as usual.
  setTitle('pin');
  if (location.hash === '#pin') {
    chosen = true;
  } else {
    showMode(params.get('pinned') === '1' ? 'usage' : 'pin', false);
    if (reachable) {
      askExtension();
      pollTimer = setInterval(askExtension, POLL_MS);
      setTimeout(stopPolling, POLL_FOR_MS);
    }
  }
  countInstall();

  // Back from the toolbar: check at once, also after the 10 minutes are over.
  document.addEventListener('visibilitychange', askExtension);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[data-switch="pin"]');
    if (!link) return;
    event.preventDefault();
    try {
      // The hash keeps the choice across a reload.
      history.replaceState(null, '', '#pin');
    } catch {
      // some file:// setups refuse it; the choice still holds until the page is closed
    }
    chooseToPin();
  });

  addEventListener('hashchange', () => {
    if (location.hash === '#pin' && !chosen) chooseToPin();
  });
})();
