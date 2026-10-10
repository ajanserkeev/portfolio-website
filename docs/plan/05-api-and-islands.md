# План 05: Живые функции (API и острова)

> Основано на `docs/02-implementation-plan.md` (раздел 5, План 05).
> Цель: сайт сам является работающим кейсом: настоящий агент, заявки в CRM, бронирование звонков, интерактивный калькулятор. События отражаются в 3D.
> Каждая задача выполняется по TDD: тест → код → проверка `pnpm verify` → коммит.

---

### Task 1: Каркас API на Hono, конфигурация и healthcheck

**Files:**
- Create: `api/src/config.ts`, `api/src/app.ts`, `api/src/server.ts`, `api/tests/app.test.ts`
- Modify: `package.json` (добавление `hono`, `@hono/node-server`)

- [ ] **Step 1: Установить зависимости `hono` и `@hono/node-server`, указанные в мастер-плане**
- [ ] **Step 2: Реализовать типизированную конфигурацию `api/src/config.ts` с валидацией через Zod**
- [ ] **Step 3: Создать приложение Hono с request-id, CORS, логированием и маршрутом `/api/health`**
- [ ] **Step 4: Написать тесты `api/tests/app.test.ts` с вызовами через `app.request()` без сетевых сокетов**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 2: Встроенное хранилище на `node:sqlite` и ограничитель запросов (rate limiter)

**Files:**
- Create: `api/src/db.ts`, `api/src/limits.ts`, `api/tests/db.test.ts`, `api/tests/limits.test.ts`

- [ ] **Step 1: Написать юнит-тесты создания таблиц и сохранения записей в SQLite (memory и файл)**
- [ ] **Step 2: Реализовать модуль `api/src/db.ts` на встроенном `node:sqlite` без внешних зависимостей**
- [ ] **Step 3: Реализовать middleware лимитов `api/src/limits.ts` по IP и сессии**
- [ ] **Step 4: Написать тесты на превышение лимита (HTTP 429 Too Many Requests)**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 3: Маршрут заявок `/api/lead` с защитой от спама и адаптерами CRM/Telegram

**Files:**
- Create: `api/src/routes/lead.ts`, `api/src/integrations/telegram.ts`, `api/src/integrations/crm.ts`, `api/tests/lead.test.ts`

- [ ] **Step 1: Написать тесты валидации заявки (zod), проверки honeypot, времени заполнения и согласия**
- [ ] **Step 2: Реализовать адаптеры уведомлений Telegram и CRM с интерфейсами для моков**
- [ ] **Step 3: Реализовать обработчик `POST /api/lead` с сохранением в БД и асинхронной отправкой**
- [ ] **Step 4: Проверить прохождение тестов спам-защиты и успешного создания**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 4: Генерация свободных слотов и бронирование звонков (`/api/slots`, `/api/book`)

**Files:**
- Create: `api/src/booking/slots.ts`, `api/src/routes/slots.ts`, `api/src/routes/book.ts`, `api/tests/booking.test.ts`

- [ ] **Step 1: Написать чистые тесты генератора слотов: рабочие часы, часовой пояс Asia/Almaty, занятые интервалы**
- [ ] **Step 2: Реализовать чистую функцию `generateSlots(rules, busy, now, tz)`**
- [ ] **Step 3: Реализовать маршрут `GET /api/slots` и `POST /api/book` с обработкой гонки (HTTP 409 Conflict)**
- [ ] **Step 4: Проверить тесты идемпотентности и бронирования**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 5: Калькулятор оценки стоимости и сроков проекта

**Files:**
- Create: `src/data/pricing.ts`, `src/lib/estimate.ts`, `src/lib/estimate.test.ts`

- [ ] **Step 1: Зафиксировать структуру тарифов и надбавок в `src/data/pricing.ts`**
- [ ] **Step 2: Написать юнит-тесты расчета вилки стоимости и сроков для всех комбинаций опций**
- [ ] **Step 3: Реализовать чистую функцию `estimate(selection, priceTable)`**
- [ ] **Step 4: Проверить `pnpm test`**
- [ ] **Step 5: Commit**

---

### Task 6: Интерактивные острова (Preact): калькулятор, форма заявки и виджет бронирования

**Files:**
- Create: `src/islands/Calculator.tsx`, `src/islands/LeadForm.tsx`, `src/islands/BookingWidget.tsx`
- Modify: `astro.config.mjs`, `package.json`, `src/components/LevelSection.astro`
- Test: `tests/e2e/islands.spec.ts`

- [ ] **Step 1: Подключить `@astrojs/preact` и `preact` согласно плану**
- [ ] **Step 2: Реализовать острова с клиентской валидацией, состоянием на сигналах и связью с шиной событий**
- [ ] **Step 3: Интегрировать острова в секции этажей (`LevelSection.astro`) с директивами `client:idle` / `client:visible`**
- [ ] **Step 4: Написать e2e тесты взаимодействия с калькулятором, отправки заявки и выбора слота**
- [ ] **Step 5: Проверить соблюдение бюджета стартового бандла (острова не попадают в первый экран)**
- [ ] **Step 6: Commit**

---

### Task 7: Чат-агент (SSE, стриминг, сценарный режим и глубокие ссылки)

**Files:**
- Create: `api/src/routes/chat.ts`, `api/src/agent/scripted.ts`, `src/islands/ChatSheet.tsx`, `src/lib/deeplinks.ts`, `api/tests/chat.test.ts`
- Test: `tests/e2e/chat.spec.ts`

- [ ] **Step 1: Реализовать сценарный режим чата без внешних LLM для надежной работы при лимитах**
- [ ] **Step 2: Реализовать маршрут SSE `/api/chat` со стримингом токенов и вызовом инструментов**
- [ ] **Step 3: Создать выдвижной интерфейс чата `ChatSheet.tsx` с глубокими ссылками в Telegram/WhatsApp**
- [ ] **Step 4: Написать e2e тест открытия чата, получения ответов и перехода к бронированию/заявке**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**
