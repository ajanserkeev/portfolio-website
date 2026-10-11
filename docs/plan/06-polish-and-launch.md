# План 06: Полировка, звук, доступность, мониторинг и запуск

> **Цель:** довести сайт до запуска: режим Static с постерами, звуковой движок на WebAudio (опциональный), доступность с клавиатуры (a11y), клиентская аналитика по шине событий, маршрут мониторинга `/api/log`, Docker-сборка и Caddyfile.

---

### Task 1: Генерация постеров и OG-изображений (`scripts/posters.ts`)

**Files:**
- Create: `scripts/posters.ts`, `public/posters/.gitkeep`

- [x] **Step 1: Реализовать скрипт `scripts/posters.ts` для скриншотов этажей в режиме `?shot=<этаж>`**
- [x] **Step 2: Сохранение постеров для каждого уровня (`roof`, `agents`, `crm`, `booking`, `workshop`, `basement`)**
- [x] **Step 3: Проверить `pnpm build && pnpm budgets`**
- [x] **Step 4: Commit**

---

### Task 2: Постеры для режима Static и поддержка Save-Data

**Files:**
- Create: `src/components/StaticLevel.astro`
- Modify: `src/components/LevelSection.astro`

- [x] **Step 1: Создать компонент `StaticLevel.astro` с отображением фонового постера этажа**
- [x] **Step 2: Подключить в `LevelSection.astro` отображение постера в режиме `static` или при заголовке Save-Data**
- [x] **Step 3: Проверить тесты `tests/e2e/static.spec.ts`**
- [x] **Step 4: Commit**

---

### Task 3: Звуковое сопровождение на WebAudio (`src/ui/sound.ts`)

**Files:**
- Create: `src/ui/sound.ts`, `src/ui/sound.test.ts`
- Modify: `src/components/TopBar.astro`

- [x] **Step 1: Написать юнит-тесты звукового модуля (выключен по умолчанию, синтез клика, лифта и капсулы)**
- [x] **Step 2: Реализовать синтезатор звуков на чистом WebAudio API без внешних аудио-файлов (< 5 КБ)**
- [x] **Step 3: Добавить кнопку включения звука в `TopBar.astro` с сохранением состояния в `sessionStorage`**
- [x] **Step 4: Проверить `pnpm test`**
- [x] **Step 5: Commit**

---

### Task 4: Доступность (a11y) и навигация с клавиатуры

**Files:**
- Create: `src/ui/keyboard.ts`, `tests/e2e/a11y.spec.ts`
- Modify: `src/components/Stage.astro`

- [ ] **Step 1: Реализовать навигацию по этажам по клавишам PageUp / PageDown / Стрелки в `src/ui/keyboard.ts`**
- [ ] **Step 2: Написать e2e тест доступности с клавиатуры и проверкой видимого фокуса**
- [ ] **Step 3: Проверить прохождение теста Playwright**
- [ ] **Step 4: Commit**

---

### Task 5: Аналитика воронки событий (`src/ui/analytics.ts`)

**Files:**
- Create: `src/ui/analytics.ts`, `src/ui/analytics.test.ts`

- [ ] **Step 1: Написать юнит-тесты маппинга событий `TowerEvent` в аналитические цели**
- [ ] **Step 2: Реализовать `src/ui/analytics.ts` с поддержкой Яндекс Метрики и Umami без блокировки основного потока**
- [ ] **Step 3: Проверить `pnpm test`**
- [ ] **Step 4: Commit**

---

### Task 6: Маршрут мониторинга клиентских ошибок (`/api/log`)

**Files:**
- Create: `api/src/routes/log.ts`, `api/tests/log.test.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Написать тесты на валидацию и сохранение логов ошибок**
- [ ] **Step 2: Реализовать маршрут `POST /api/log` с жестким rate limit (max 10 в минуту) и фильтром спама**
- [ ] **Step 3: Смонтировать в `api/src/app.ts`**
- [ ] **Step 4: Проверить `pnpm verify`**
- [ ] **Step 5: Commit**

---

### Task 7: Docker-сборка и конфигурация Caddy (`Dockerfile`, `Caddyfile`)

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`

- [ ] **Step 1: Создать многоэтапный `Dockerfile` для сборки статики Astro и запуска Node API сервера**
- [ ] **Step 2: Создать `deploy/Caddyfile` с конфигурацией сжатия zstd/gzip, HTTPS, кэшированием статики и прокси на API**
- [ ] **Step 3: Создать `docker-compose.yml` для локального запуска полного стека**
- [ ] **Step 4: Проверить сборку `docker build` (при наличии) и `pnpm verify`**
- [ ] **Step 5: Commit**
