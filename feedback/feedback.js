// @ts-check
/**
 * The "What went wrong?" page (docs/ARCHITECTURE.md §18, EDGE_CASES U3, U4, U6, U17). The panel
 * opens it after 1–3 stars: `/feedback/?stars=N&from=ask|strip&v=<version>&hl=<UI language>
 * &utm_source=extension&utm_medium=rating` (src/core/rating.ts, starTarget).
 *
 * - Language: `hl` — Russian for ru, English otherwise (the browser's language without hl).
 * - Opened by the extension = stars 1–3, from ask|strip and utm_medium=rating. Only then the
 *   page shows the given stars and "You rated … N out of 5", and sends "feedback_opened
 *   {stars, from, version, chrome_language}" once per tab. Anything else (stars 0, 4, 5, abc,
 *   no utm, a search, a forwarded link) — the same page without the stars and without the
 *   event; the answers still work, with stars null (U3).
 * - The answers: "feedback_reason {stars, reason, answer_id}" on a click, "feedback_comment
 *   {stars, reason, text, answer_id}" on "Send" (site/shared/count.js).
 * - The store link under the card is a plain link: always there, never counted.
 */
(function () {
  'use strict';

  const STARS = /^[1-3]$/;
  const FROM = ['ask', 'strip'];
  const VERSION = /^\d+(\.\d+){0,3}$/;
  const site = /** @type {{ LinkExtractorSite?: LinkExtractorSite }} */ (
    /** @type {unknown} */ (window)
  ).LinkExtractorSite;
  if (!site) return; // ../shared/count.js did not load: the page stays as the markup has it

  const params = new URLSearchParams(location.search);
  const strings = /** @type {{ FEEDBACK_STRINGS?: unknown }} */ (/** @type {unknown} */ (window))
    .FEEDBACK_STRINGS;
  site.applyLanguage(site.pickLanguage(params.get('hl'), navigator.language), strings);

  const starsParam = params.get('stars');
  const from = params.get('from');
  const fromExtension =
    starsParam !== null &&
    STARS.test(starsParam) &&
    from !== null &&
    FROM.includes(from) &&
    params.get('utm_medium') === 'rating';
  const stars = fromExtension ? Number(starsParam) : null;

  if (stars !== null) {
    showStars(stars);
    const v = params.get('v');
    /** @type {Record<string, unknown>} */
    const properties = { stars, from, version: v !== null && VERSION.test(v) ? v : null };
    const language = site.languageTag(params.get('hl'));
    if (language !== null) properties.chrome_language = language;
    site.sendOnce('feedbackCounted', 'feedback_opened', properties);
  }

  site.setupAnswers({
    reasonEvent: 'feedback_reason',
    commentEvent: 'feedback_comment',
    properties: { stars },
  });

  /** @param {number} count 1–3, checked above */
  function showStars(count) {
    const given = document.querySelector('[data-given]');
    if (given instanceof HTMLElement) {
      given.querySelectorAll('svg').forEach((star, index) => {
        star.classList.toggle('on', index < count);
      });
      given.hidden = false;
    }
    const rated = document.querySelector('[data-rated]');
    if (rated instanceof HTMLElement) {
      rated.textContent = (rated.textContent || '').replace('$1', String(count));
      rated.hidden = false;
    }
  }
})();
