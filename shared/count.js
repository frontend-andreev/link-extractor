// @ts-check
/**
 * Shared by the site's answer pages, /uninstall/ and /feedback/ (docs/ARCHITECTURE.md §18,
 * EDGE_CASES U3–U6): the PostHog counter and the "one click" answer card.
 *
 * The counter: one anonymous event per call, a fetch with keepalive to PostHog's capture
 * endpoint, like the install counter of the welcome page. distinct_id is a random UUID kept in
 * this site's localStorage ('le_id'), so the pages of one person in one profile share it; it
 * is never in a link and never in the extension. Silent — no request, nothing stored — unless
 * all of these hold:
 * - the page is on the published site (COUNTED_ORIGIN): a local copy, a dev server or a file
 *   opened by hand counts nothing;
 * - body[data-posthog-key] and body[data-posthog-host] are set;
 * - navigator.webdriver is not true: Playwright and any other automated Chrome never count
 *   (the bug of 2026-11-02: tests sent 20 false events). Page tests of the counter set it to
 *   false on purpose.
 * Errors are swallowed: whatever goes wrong, the page works as before.
 *
 * The answer card (setupAnswers): body[data-step] is "ask" (reason buttons), "got" (the reason
 * is in, an optional comment) or "sent" (thanks). A click on a reason is the answer: it is
 * sent at once. "Change" goes back to the buttons; a new click sends a new answer with the
 * same answer_id (random per page load), and the last one per answer_id is the one that
 * counts. Without JS the page stays on "ask": the question is there, nothing breaks.
 * A double click is one click: the card keeps its height on every step (answers.css), and
 * the second click of a double click on a button or a link does nothing.
 *
 * A plain script, not a module: modules do not load from file://. It defines one global,
 * window.LinkExtractorSite, read by the page's own script that loads after it. Nothing from
 * the link is ever written into the page as HTML; texts go in with textContent.
 */

/**
 * @typedef {{
 *   send: (event: string, properties: Record<string, unknown>) => boolean,
 *   sendOnce: (mark: string, event: string, properties: Record<string, unknown>) => void,
 *   languageTag: (value: string | null) => string | null,
 *   pickLanguage: (hl: string | null, browserLanguage: string | undefined) => string,
 *   applyLanguage: (language: string, table: unknown) => void,
 *   setupAnswers: (options: AnswerOptions) => void,
 * }} LinkExtractorSite
 */
/**
 * @typedef {{
 *   reasonEvent: string,
 *   commentEvent: string,
 *   properties: Record<string, unknown>,
 * }} AnswerOptions
 */

(function () {
  'use strict';

  /** The one address whose visits count; every page that loads this file shares it. */
  const COUNTED_ORIGIN = 'https://link-extractor.com';
  const ID_KEY = 'le_id';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const LANGUAGE_TAG = /^[a-z]{2,3}([-_][a-z0-9]{1,8})*$/i;
  /** Languages with texts (the page's strings.js); others get English. */
  const LANGUAGES = ['en', 'ru'];
  /** The comment field's limit (also its maxlength). */
  const MAX_TEXT = 2000;

  /**
   * The browser's random ID on this site (pseudonymous, not anonymous: docs/PRIVACY.md).
   * Missing or not a UUID — a new one, saved. Storage closed — a new one on every call: the
   * event still counts, only unlinked (U5).
   */
  function anonId() {
    try {
      const saved = localStorage.getItem(ID_KEY);
      if (saved !== null && UUID.test(saved)) return saved;
      const id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
      return id;
    } catch {
      return crypto.randomUUID();
    }
  }

  /** Where to send, or null when the page must stay silent (see the header). */
  function counter() {
    if (location.origin !== COUNTED_ORIGIN) return null;
    if (navigator.webdriver === true) return null;
    const key = document.body.dataset.posthogKey || '';
    const host = document.body.dataset.posthogHost || '';
    return key && host ? { key, host } : null;
  }

  /**
   * One event. True when it went out (its answer is not awaited), false when the page is
   * silent or the browser refused.
   * @param {string} event
   * @param {Record<string, unknown>} properties
   */
  function send(event, properties) {
    const target = counter();
    if (!target) return false;
    try {
      const body = JSON.stringify({
        api_key: target.key,
        event,
        distinct_id: anonId(),
        properties: { ...properties, $process_person_profile: false, $host: location.host },
      });
      // eslint-disable-next-line no-restricted-globals -- the site's counter, its one request
      fetch(target.host + '/i/v0/e/', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => undefined);
      return true;
    } catch {
      return false; // no fetch or no crypto.randomUUID (not a secure context)
    }
  }

  /**
   * One event per tab: `mark` in sessionStorage keeps a reload, or a tab restored after a
   * restart of Chrome, from counting twice (U4). Storage blocked — counted anyway.
   * @param {string} mark
   * @param {string} event
   * @param {Record<string, unknown>} properties
   */
  function sendOnce(mark, event, properties) {
    if (!counter()) return;
    try {
      if (sessionStorage.getItem(mark)) return;
      sessionStorage.setItem(mark, '1');
    } catch {
      // storage blocked: count anyway; a reload may then count twice, which is rare
    }
    send(event, properties);
  }

  /** @param {string | null} value a language tag from the link, or null when it is junk */
  function languageTag(value) {
    return value !== null && LANGUAGE_TAG.test(value) ? value : null;
  }

  /**
   * `hl` (the extension's UI language); without a usable one — the browser's language; a
   * language without texts — English.
   * @param {string | null} hl
   * @param {string | undefined} browserLanguage
   */
  function pickLanguage(hl, browserLanguage) {
    const tag = languageTag(hl) || browserLanguage || '';
    const primary = tag.toLowerCase().split(/[-_]/)[0] || '';
    return LANGUAGES.includes(primary) ? primary : 'en';
  }

  /**
   * English is the markup itself; another language replaces texts and placeholders from the
   * page's table. No table for it — the page stays English as a whole, not half-translated.
   * @param {string} language
   * @param {unknown} table `{ <language>: { <key>: <text> } }` from strings.js
   */
  function applyLanguage(language, table) {
    if (language !== 'en' && typeof table === 'object' && table !== null && language in table) {
      const strings = /** @type {Record<string, unknown>} */ (table)[language];
      if (typeof strings === 'object' && strings !== null) {
        const texts = /** @type {Record<string, unknown>} */ (strings);
        document.documentElement.lang = language;
        for (const element of document.querySelectorAll('[data-i18n]')) {
          const text = texts[element.getAttribute('data-i18n') || ''];
          if (typeof text === 'string') element.textContent = text;
        }
        for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
          const text = texts[element.getAttribute('data-i18n-placeholder') || ''];
          if (typeof text === 'string') element.setAttribute('placeholder', text);
        }
      }
    }
    const title = document.querySelector('h1');
    if (title && title.textContent) document.title = title.textContent;
  }

  /** @param {string} step */
  function showStep(step) {
    document.body.dataset.step = step;
  }

  /**
   * Wires the answer card (see the header). `properties` go with every answer, as is.
   * @param {AnswerOptions} options
   */
  function setupAnswers(options) {
    const field = document.querySelector('[data-comment]');
    const sendButton = document.querySelector('[data-send]');
    const chosen = document.querySelector('[data-chosen]');
    const gotTitle = document.querySelector('[data-got-title]');
    const sent = document.querySelector('[data-sent]');
    if (!(field instanceof HTMLTextAreaElement) || !(sendButton instanceof HTMLButtonElement)) {
      return;
    }
    /** One per page load: every answer and the comment of this visit share it. */
    let answerId = '';
    try {
      answerId = crypto.randomUUID();
    } catch {
      // not a secure context: then nothing is sent either (send needs randomUUID too)
    }
    /** @type {string | null} */
    let reason = null;
    let done = false;

    const syncSend = () => {
      sendButton.disabled = done || field.value.trim() === '';
    };

    for (const button of document.querySelectorAll('button[data-reason]')) {
      button.addEventListener('click', () => {
        if (done) return;
        reason = button.getAttribute('data-reason');
        send(options.reasonEvent, { ...options.properties, reason, answer_id: answerId });
        const label = button.querySelector('[data-i18n]');
        if (chosen) chosen.textContent = label ? label.textContent : button.textContent;
        showStep('got');
        // "Something else" says nothing by itself: straight to the field.
        if (reason === 'other') field.focus();
        else if (gotTitle instanceof HTMLElement) gotTitle.focus();
      });
    }

    const change = document.querySelector('[data-change]');
    if (change) {
      change.addEventListener('click', () => {
        if (done) return;
        showStep('ask');
        const current = document.querySelector(`button[data-reason="${reason || ''}"]`);
        const target = current || document.querySelector('button[data-reason]');
        if (target instanceof HTMLElement) target.focus();
      });
    }

    // The second click of a double click (detail 2 and up) is never a second action: it would
    // land on whatever the first click put under the pointer — "Change", the "Send" of the
    // next step, the store link. The first click has already done what was meant; keyboard
    // presses (detail 0) and fields (a triple click selects a line) are not touched.
    document.addEventListener(
      'click',
      (event) => {
        if (event.detail < 2) return;
        const target = event.target;
        if (target instanceof Element && target.closest('button, a[href]')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );

    field.addEventListener('input', syncSend);
    sendButton.addEventListener('click', () => {
      const text = field.value.trim().slice(0, MAX_TEXT);
      if (done || text === '') return;
      done = true;
      send(options.commentEvent, { ...options.properties, reason, text, answer_id: answerId });
      syncSend();
      showStep('sent');
      if (sent instanceof HTMLElement) sent.focus();
    });
    syncSend();
  }

  /** @type {LinkExtractorSite} */
  const api = {
    send,
    sendOnce,
    languageTag,
    pickLanguage,
    applyLanguage,
    setupAnswers,
  };
  /** @type {{ LinkExtractorSite?: LinkExtractorSite }} */ (
    /** @type {unknown} */ (window)
  ).LinkExtractorSite = api;
})();
