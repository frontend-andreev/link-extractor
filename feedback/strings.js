// @ts-check
/**
 * Texts of the "What went wrong?" page in languages other than English (English is in
 * index.html). Keys match data-i18n / data-i18n-placeholder there; a language must have every
 * key, or the page would come out half-translated (tests/unit/welcome-site.test.ts checks it).
 * Texts are the designer's (docs/design/m18/, variant 2 of the pages). "Link Extractor" keeps a
 * non-breaking space, so the name never breaks across lines; "$1" in `rated` is the number of
 * stars (feedback.js puts it in).
 * A plain script, not a module: the page must open from file:// too.
 */
/** @type {{ FEEDBACK_STRINGS?: Record<string, Record<string, string>> }} */ (
  /** @type {unknown} */ (window)
).FEEDBACK_STRINGS = {
  ru: {
    title: 'Что пошло не так?',
    rated: 'Вы поставили Link Extractor $1 из 5.',
    lead: 'Расскажите, что исправить. Это видим только мы — это не публичный отзыв.',
    question: 'В чём была проблема?',
    oneClick: 'Нажмите причину — ответ сразу придёт нам.',
    reasonLinksNotFound: 'Нужных ссылок не нашлось',
    reasonWrongResult: 'Результат неверный или неполный',
    reasonHardToUse: 'Неудобно пользоваться',
    reasonMissingFeature: 'Не хватает функции',
    reasonSlow: 'Медленно или зависает',
    reasonOther: 'Другое',
    got: 'Спасибо, ответ получен.',
    change: 'Изменить',
    addWords: 'Хотите добавить пару слов?',
    optional: '(необязательно)',
    placeholder: 'Что нам исправить?',
    send: 'Отправить',
    privacyNote: 'Не пишите сюда личных данных: мы не спрашиваем имя и почту.',
    thanks: 'Спасибо!',
    sentText: 'Мы читаем каждое сообщение и исправляем, что можем.',
    closeTab: 'Эту вкладку можно закрыть.',
    publicReviewText: 'Публичный отзыв тоже можно оставить в',
    publicReviewLink: 'Chrome Web Store',
  },
};
