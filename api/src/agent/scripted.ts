export interface ScriptedReply {
  text: string;
  tool?: {
    name: 'get_free_slots' | 'book_call' | 'create_lead' | 'show_case';
    data?: Record<string, unknown>;
  };
}

export function handleScriptedChat(
  message: string,
  locale: 'ru' | 'en' = 'ru',
  _pain?: string,
): ScriptedReply {
  const query = message.toLowerCase().trim();
  const isRu = locale === 'ru';

  // Booking / Calls intent
  if (/созвон|запис|слот|встреч|календар|book|call|schedule|meeting|slot/.test(query)) {
    return {
      text: isRu
        ? 'С удовольствием обсудим задачу на 20-минутном созвоне! Я открываю свободные слоты в нашем календаре — выберите удобное время.'
        : "I'd be glad to discuss your project on a 20-minute call! Opening available slots from our calendar — please choose a convenient time.",
      tool: {
        name: 'get_free_slots',
        data: { days: 7 },
      },
    };
  }

  // Cost / Pricing / Estimate intent
  if (/цен|стоимост|сколько|прайс|расчет|калькулятор|price|cost|how much|estimate/.test(query)) {
    return {
      text: isRu
        ? 'Стоимость зависит от состава модулей: базовые боты и интеграции от $1,500, комплексные платформы до $5,000+. Вы можете воспользоваться калькулятором проекта внизу башни или описать требования, и мы подготовим расчет.'
        : 'Pricing depends on the scope: targeted AI bots and integrations start from $1,500, complex multi-tier platforms go up to $5,000+. You can use the project estimator at the base of the tower or describe your requirements.',
    };
  }

  // Cases / Portfolio intent
  if (/кейс|пример|портфоли|покажи|выполненн|case|portfolio|example/.test(query)) {
    return {
      text: isRu
        ? 'У нас есть реализованные решения: медицинский ИИ-ассистент, система бронирования отелей, CRM для логистики и финтех-портал. Какой стек вас больше интересует?'
        : 'We have production cases: medical AI receptionist, hotel booking engine, logistics CRM, and fintech portal. Which stack interests you?',
      tool: {
        name: 'show_case',
        data: { floor: 'agents' },
      },
    };
  }

  // AI Agents / Bots
  if (/агент|бот|нейро|llm|ии|ai|agent|bot|gpt|claude/.test(query)) {
    return {
      text: isRu
        ? 'На 4 этаже Башни (Лаборатория агентов) мы проектируем интеллектуальных ассистентов: голосовые и текстовые операторы, квалификация лидов, автономные пайплайны с памятью и интеграциями в CRM.'
        : 'On Floor 4 of the Tower (Agent Lab) we build intelligent assistants: voice and text agents, lead qualification, autonomous pipelines with memory and CRM integration.',
    };
  }

  // CRM / Integrations
  if (/crm|интеграц|1с|пайплайн|amo|bitrix|erp|pipeline|webhook/.test(query)) {
    return {
      text: isRu
        ? '3 этаж — Серверная интеграций. Мы связываем мессенджеры, телефонию, CRM (AmoCRM, Bitrix24) и складские учетные системы в единый надежный пайплайн без потерь заявок.'
        : 'Floor 3 is the Integration Server Room. We unify messaging channels, telephony, CRMs (AmoCRM, Bitrix24), and ERPs into resilient automated pipelines.',
    };
  }

  // Greetings & General
  if (/привет|здравствуй|добрый|hello|hi|hey|who are you|кто вы/.test(query)) {
    return {
      text: isRu
        ? 'Приветствую! Я виртуальный агент Башни. Мы проектируем ИИ-агентов, CRM-пайплайны, системы бронирования и цифровые интерфейсы. Чем могу помочь?'
        : 'Welcome! I am the Tower virtual agent. We design production AI agents, CRM pipelines, booking engines, and digital interfaces. How can I help you?',
    };
  }

  // Fallback
  return {
    text: isRu
      ? 'Башня — это интерактивная демонстрация наших возможностей: от автономных агентов и синхронизации с CRM до онлайн-записи и веб-интерфейсов. Хотите рассчитать примерную смету или записаться на созвон?'
      : 'The Tower is a live showcase of our capabilities: autonomous agents, CRM integrations, booking systems, and interfaces. Would you like a cost estimate or an intro call?',
  };
}
