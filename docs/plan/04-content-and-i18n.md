# План 04 — Контент, кейсы, i18n, SEO

> **Goal:** Все тексты сайта полностью вычитаны на двух языках (RU/EN), подключены локальные оптимизированные шрифты, создана коллекция реальных кейсов через Content Layer Astro, реализованы страницы кейсов, карточки на этажах, юридические документы (политика конфиденциальности) и полная SEO/schema.org разметка с sitemap.

**Architecture:** Статический рендеринг страниц кейсов и локалей в Astro 5+, строгая zod-схема метаданных проектов, единая дизайн-система типографики без сторонних CDN, сохранение позиции лифта/этажа при переходе на кейс и возврате назад.

**Tech Stack:** Astro 7.3.8 · TypeScript 6.0.3 · Zod 4.6.5 · Vitest 5.0.3 · Playwright 1.64.0

**Spec:** `docs/01-brief.md` (разделы 3.1, 3.8, 3.9), `docs/02-implementation-plan.md` (раздел 5, План 04)

---

## Global Constraints

- **Слов внутри 3D нет:** Все тексты — в `src/i18n/ru.ts` и `src/i18n/en.ts` с идентичными ключами.
- **Шрифты локальные:** Woff2 подмножества (кириллица + латиница), self-hosted в `public/fonts/`, `font-display: swap`, вес ≤ 60 КБ для первого экрана, нулевой CLS.
- **Строгая схема кейса:** Заголовок, аннотация, услуга, отрасль, локация/город, измеримые метрики, стек технологий, тег NDA, порядок отображения.
- **Bfcache + возврат:** Переход на страницу кейса и возврат назад («Назад» в браузере) возвращает пользователя ровно на тот этаж, откуда был совершен переход.
- **SEO & a11y:** Schema.org (`Organization`, `Service`, `CreativeWork`), уникальные title/description, `hreflang`, semantic HTML, доступность форм.
- **TDD:** Сначала тест → падает → код → проходит → коммит.

---

## Структура файлов этого плана

| Файл | Ответственность |
|---|---|
| `public/fonts/*`, `src/styles/fonts.css` | Локальные шрифты woff2, font-face правила, fallback метрики |
| `src/content.config.ts`, `src/content/cases/{ru,en}/*.mdx` | Схема zod и файлы кейсов на русском и английском |
| `src/i18n/ru.ts`, `src/i18n/en.ts`, `i18n.test.ts` | Полные словари всех разделов, этажей, процессов, FAQ и команды |
| `src/components/CaseCard.astro` | Карточка кейса с метриками и бейджем услуги в секциях этажей |
| `src/pages/cases/[slug].astro`, `src/pages/en/cases/[slug].astro` | Отдельные страницы кейсов с возвратом к этажу |
| `src/pages/privacy.astro`, `src/pages/en/privacy.astro` | Политика конфиденциальности и обработка персональных данных |
| `src/components/Seo.astro`, `public/robots.txt` | Мета-теги, canonical, hreflang, schema.org JSON-LD, sitemap |

---

### Task 1: Шрифты — локальный хостинг, woff2 и типографика

**Files:**
- Create: `public/fonts/*`, `src/styles/fonts.css`
- Modify: `src/styles/global.css`, `src/layouts/Base.astro`

- [x] **Step 1: Создать оптимизированные woff2 шрифты и font-face правила в `src/styles/fonts.css`**
- [x] **Step 2: Подключить preload заголовочного шрифта в `Base.astro` и настроить шрифтовые переменные**
- [x] **Step 3: Проверить бюджет первого экрана и отсутствие CLS через `pnpm verify`**
- [x] **Step 4: Commit**

---

### Task 2: Схема и коллекция кейсов в Astro Content Layer

**Files:**
- Create: `src/content.config.ts`, `src/content/cases/ru/*.mdx`, `src/content/cases/en/*.mdx`
- Test: `tests/unit/cases.test.ts`

- [ ] **Step 1: Написать тест валидации схемы кейсов `tests/unit/cases.test.ts`**
- [ ] **Step 2: Создать `src/content.config.ts` со строгой zod-схемой кейса**
- [ ] **Step 3: Наполнить коллекцию эталонными кейсами для каждого направления (агенты, CRM, веб, бронирование)**
- [ ] **Step 4: Проверить валидацию и прохождение тестов `pnpm test && pnpm check`**
- [ ] **Step 5: Commit**

---

### Task 3: Полнота словарей RU/EN, переключатель языка и навигация

**Files:**
- Modify: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/i18n.test.ts`, `src/components/TopBar.astro`

- [ ] **Step 1: Расширить тесты словарей в `i18n.test.ts` на полноту всех секций, FAQ и правовых ссылок**
- [ ] **Step 2: Наполнить `ru.ts` и `en.ts` текстами для всех этажей башни, процессов, команды и FAQ**
- [ ] **Step 3: Добавить переключатель языка с сохранением якоря этажа в `TopBar.astro`**
- [ ] **Step 4: Проверить совпадение ключей `pnpm test`**
- [ ] **Step 5: Commit**

---

### Task 4: Карточки кейсов в секциях этажей

**Files:**
- Create: `src/components/CaseCard.astro`
- Modify: `src/components/LevelSection.astro`, `src/components/TowerPage.astro`

- [ ] **Step 1: Создать компонент `CaseCard.astro` с отображением метрик, стека и ссылки на страницу кейса**
- [ ] **Step 2: Интегрировать фильтрацию и вывод кейсов по услуге в секциях этажей (`LevelSection.astro`)**
- [ ] **Step 3: Написать e2e тест отображения карточек кейсов на этажах**
- [ ] **Step 4: Проверить `pnpm verify`**
- [ ] **Step 5: Commit**

---

### Task 5: Страницы кейсов `/cases/[slug]` и `/en/cases/[slug]`

**Files:**
- Create: `src/pages/cases/[slug].astro`, `src/pages/en/cases/[slug].astro`
- Test: `tests/e2e/cases.spec.ts`

- [ ] **Step 1: Написать e2e тест перехода на кейс и возврата по кнопке/назад в браузер к нужному этажу**
- [ ] **Step 2: Реализовать шаблоны страниц кейсов для русской и английской версий**
- [ ] **Step 3: Реализовать кнопку «Назад в башню» с якорной ссылкой на родительский этаж**
- [ ] **Step 4: Проверить `pnpm verify`**
- [ ] **Step 5: Commit**

---

### Task 6: Юридические страницы: Политика конфиденциальности и согласие на ПД

**Files:**
- Create: `src/pages/privacy.astro`, `src/pages/en/privacy.astro`
- Test: `tests/e2e/privacy.spec.ts`

- [ ] **Step 1: Написать e2e тест доступности страницы политики и ссылок на неё**
- [ ] **Step 2: Реализовать страницы политики конфиденциальности (законодательство РК и 152-ФЗ)**
- [ ] **Step 3: Добавить ссылки на политику в футер и формы заявок**
- [ ] **Step 4: Проверить `pnpm verify`**
- [ ] **Step 5: Commit**

---

### Task 7: SEO: Schema.org, мета-теги, Open Graph, Sitemap и Robots.txt

**Files:**
- Create: `src/components/Seo.astro`, `public/robots.txt`
- Modify: `src/layouts/Base.astro`, `astro.config.mjs`

- [ ] **Step 1: Создать компонент `Seo.astro` с мета-тегами, Open Graph, Twitter Cards, canonical и hreflang**
- [ ] **Step 2: Реализовать генерацию структурированных данных Schema.org (Organization, Service, CreativeWork)**
- [ ] **Step 3: Добавить `public/robots.txt` и настроить генерацию sitemap**
- [ ] **Step 4: Написать e2e тест на валидность мета-тегов и json-ld разметки**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**
