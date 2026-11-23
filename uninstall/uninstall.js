// @ts-check
/**
 * The uninstall page (docs/ARCHITECTURE.md §18, EDGE_CASES U3, U4, U6). Chrome opens it after
 * the extension is removed: `/uninstall/?v=<version>&hl=<UI language>&utm_source=extension
 * &utm_medium=uninstall` (src/welcome/logic.ts, uninstallUrl).
 *
 * - Language: `hl` — Russian for ru, English otherwise (the browser's language without hl).
 * - "extension_uninstalled {version, chrome_language}" — only when the extension opened the
 *   page (utm_medium=uninstall and a version-shaped v), once per tab. A visitor from a search
 *   or a forwarded link gets the same page without it, and may still answer (U3).
 * - The answers: "uninstall_reason {reason, answer_id, version}" on a click,
 *   "uninstall_comment {reason, text, answer_id, version}" on "Send" (site/shared/count.js).
 */
(function () {
  'use strict';

  const VERSION = /^\d+(\.\d+){0,3}$/;
  const site = /** @type {{ LinkExtractorSite?: LinkExtractorSite }} */ (
    /** @type {unknown} */ (window)
  ).LinkExtractorSite;
  if (!site) return; // ../shared/count.js did not load: the page stays as the markup has it

  const params = new URLSearchParams(location.search);
  const strings = /** @type {{ UNINSTALL_STRINGS?: unknown }} */ (/** @type {unknown} */ (window))
    .UNINSTALL_STRINGS;
  site.applyLanguage(site.pickLanguage(params.get('hl'), navigator.language), strings);

  const v = params.get('v');
  const version = v !== null && VERSION.test(v) ? v : null;
  if (params.get('utm_medium') === 'uninstall' && version !== null) {
    /** @type {Record<string, unknown>} */
    const properties = { version };
    const language = site.languageTag(params.get('hl'));
    if (language !== null) properties.chrome_language = language;
    site.sendOnce('uninstallCounted', 'extension_uninstalled', properties);
  }

  site.setupAnswers({
    reasonEvent: 'uninstall_reason',
    commentEvent: 'uninstall_comment',
    properties: { version },
  });
})();
