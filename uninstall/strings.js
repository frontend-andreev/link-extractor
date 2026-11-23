// @ts-check
/**
 * Texts of the uninstall page in languages other than English (English is in index.html).
 * Keys match data-i18n / data-i18n-placeholder there; a language must have every key, or the
 * page would come out half-translated (tests/unit/welcome-site.test.ts checks it). Texts are
 * the designer's (docs/design/m18/, variant 2 of the pages). "Link Extractor" keeps a
 * non-breaking space, so the name never breaks across lines.
 * A plain script, not a module: the page must open from file:// too.
 */
/** @type {{ UNINSTALL_STRINGS?: Record<string, Record<string, string>> }} */ (
  /** @type {unknown} */ (window)
).UNINSTALL_STRINGS = {
  ru: {
    title: 'Link Extractor удалён',
    lead: 'Если есть минута, расскажите почему. Это поможет нам сделать его лучше.',
    question: 'Почему вы его удалили?',
    oneClick: 'Нажмите причину — ответ сразу придёт нам.',
    reasonLinksNotFound: 'Нужных ссылок не нашлось',
    reasonWrongResult: 'Результат неверный или неполный',
    reasonHardToUse: 'Неудобно пользоваться',
    reasonOtherExtension: 'Пользуюсь другим расширением',
    reasonOneTime: 'Нужно было один раз',
    reasonOther: 'Другое',
    got: 'Спасибо, ответ получен.',
    change: 'Изменить',
    addWords: 'Хотите добавить пару слов?',
    optional: '(необязательно)',
    placeholder: 'Что нам исправить?',
    send: 'Отправить',
    privacyNote: 'Не пишите сюда личных данных: мы не спрашиваем имя и почту.',
    thanks: 'Спасибо!',
    sentText: 'Мы читаем каждый ответ.',
    reinstallText: 'Передумали?',
    reinstallLink: 'Установить снова',
  },
};
