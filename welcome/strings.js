// @ts-check
/**
 * Texts of the welcome page in languages other than English (English is in index.html).
 * Keys match data-i18n / data-i18n-alt there; a language must have every key, or the page
 * would come out half-translated (tests/unit/welcome-site.test.ts checks it).
 * Button and menu names are the ones people see in the panel, word for word
 * (public/_locales/ru/messages.json: copyButtonUrls — the copy button; exportCsv — the CSV button
 * of a panel narrower than 400 px, as on the screenshots; filtersButton — the title of the sheet
 * the sliders icon opens; menuCollectSelection — the context menu item).
 * A plain script, not a module: the page must open from file:// too (ARCHITECTURE.md §17).
 */
/** @type {{ WELCOME_STRINGS?: Record<string, Record<string, string>> }} */ (
  /** @type {unknown} */ (window)
).WELCOME_STRINGS = {
  ru: {
    pinTitle: 'Link Extractor установлен',
    pinLead: 'Закрепите его на панели Chrome, чтобы он всегда был под рукой.',
    pinStep1: 'Нажмите значок пазла в правом верхнем углу Chrome.',
    pinStep2: 'Нажмите значок булавки рядом с Link Extractor.',
    pinFigureAlt:
      'Меню расширений Chrome со значком пазла (1) и булавкой рядом с Link Extractor (2)',
    pinnedText: 'Значок закреплён на панели',
    pinnedHelpText: 'Не видите его?',
    pinnedHelpLink: 'Как его закрепить',

    usageTitle: 'Link Extractor готов к работе',
    usageLead: 'Все ссылки страницы чистым списком: полные адреса, в порядке страницы, без дублей.',
    usageNextTitle: 'Как пользоваться',
    usageHowTitle: 'Как пользоваться',
    toolbarAlt: 'Значок Link Extractor на панели Chrome',
    step1Title: 'Откройте список ссылок',
    step1Text:
      'Откройте любую другую страницу и нажмите значок Link Extractor. Откроется боковая панель со всеми ссылками страницы.',
    step1Alt: 'Боковая панель со ссылками страницы',
    step2Title: 'Найдите нужные ссылки',
    step2Before:
      'Введите текст в поле поиска, чтобы сузить список, или нажмите значок с ползунками ',
    step2Middle: ' — откроются ',
    uiFilters: 'Фильтры и настройки',
    step2After: '.',
    step2Alt: 'Поиск по списку ссылок',
    step3Title: 'Скопируйте или скачайте',
    step3Before: 'Нажмите ',
    uiCopy: 'Копировать адреса',
    step3Middle: ', чтобы ссылки попали в буфер обмена, или ',
    uiCsv: 'CSV',
    step3After: ', чтобы скачать файл для Excel или Google Таблиц.',
    step3Alt: 'Кнопки «Копировать адреса» и CSV в боковой панели',
    step4Title: 'Нужна только часть страницы?',
    step4Before: 'Выделите её, нажмите правой кнопкой мыши и выберите ',
    uiSelection: 'Собрать ссылки из выделенного',
    step4After: '.',
    step4Alt: 'Выделенный текст и пункт контекстного меню «Собрать ссылки из выделенного»',

    footer: 'Ссылки не покидают браузер.',
  },
};
