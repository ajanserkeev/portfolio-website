import { useEffect, useState } from 'preact/hooks';
import { defaultPricingTable } from '../data/pricing';
import { bus } from '../engine/events';
import { type EstimateSelection, estimate } from '../lib/estimate';

interface Props {
  locale?: 'ru' | 'en';
}

export default function Calculator({ locale = 'ru' }: Props) {
  const isRu = locale === 'ru';

  const [pain, setPain] = useState<string>('lost-leads');
  const [selectedServices, setSelectedServices] = useState<string[]>(['agents', 'crm']);
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'enterprise'>('medium');
  const [urgency, setUrgency] = useState<'standard' | 'urgent'>('standard');
  const [supportMonths, setSupportMonths] = useState<number>(1);

  // Listen for capsule selection from 3D / roof picker
  useEffect(() => {
    const unsub = bus.on('capsule:selected', (event) => {
      if (event.pain) {
        setPain(event.pain);
        const defaults = defaultPricingTable.painDefaults[event.pain];
        if (defaults && defaults.length > 0) {
          setSelectedServices(defaults);
        }
      }
    });
    return unsub;
  }, []);

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const selection: EstimateSelection = {
    pain,
    services: selectedServices,
    complexity,
    urgency,
    supportMonths,
  };

  const result = estimate(selection, defaultPricingTable);

  const serviceLabels: Record<string, { ru: string; en: string }> = {
    agents: {
      ru: 'AI-ассистенты и боты',
      en: 'AI Agents & Bots',
    },
    crm: {
      ru: 'Интеграция CRM и пайплайнов',
      en: 'CRM & Pipeline Integration',
    },
    booking: {
      ru: 'Онлайн-запись и календари',
      en: 'Online Booking & Calendars',
    },
    web: {
      ru: 'Веб-сервис или интерфейс',
      en: 'Web Service or Interface',
    },
  };

  return (
    <div
      class="island-calculator p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-md shadow-2xl text-neutral-100 max-w-2xl mx-auto my-8"
      id="project-calculator"
    >
      <div class="mb-6">
        <h3 class="text-xl font-semibold tracking-tight text-white mb-1">
          {isRu ? 'Калькулятор проекта' : 'Project Estimator'}
        </h3>
        <p class="text-sm text-neutral-400">
          {isRu
            ? 'Выберите нужные компоненты и параметры для предварительного расчета'
            : 'Select the required components and parameters for a preliminary estimate'}
        </p>
      </div>

      {/* Services Selection */}
      <div class="mb-6">
        <span class="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">
          {isRu ? 'Компоненты решения' : 'Solution Components'}
        </span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.entries(serviceLabels).map(([id, label]) => {
            const active = selectedServices.includes(id);
            return (
              <button
                type="button"
                key={id}
                onClick={() => toggleService(id)}
                class={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all duration-200 text-left ${
                  active
                    ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-300 shadow-sm shadow-emerald-950'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span>{isRu ? label.ru : label.en}</span>
                <span
                  class={`w-4 h-4 rounded flex items-center justify-center text-xs ml-2 border ${
                    active
                      ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                      : 'border-neutral-600 bg-neutral-900'
                  }`}
                >
                  {active ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Complexity and Urgency */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <span class="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            {isRu ? 'Масштаб решения' : 'Scale & Complexity'}
          </span>
          <div class="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
            {(['simple', 'medium', 'enterprise'] as const).map((lvl) => (
              <button
                type="button"
                key={lvl}
                onClick={() => setComplexity(lvl)}
                class={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  complexity === lvl
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {lvl === 'simple' && (isRu ? 'Базовый' : 'Basic')}
                {lvl === 'medium' && (isRu ? 'Стандарт' : 'Standard')}
                {lvl === 'enterprise' && (isRu ? 'Энтерпрайз' : 'Enterprise')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span class="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            {isRu ? 'Срочность' : 'Timeline Urgency'}
          </span>
          <div class="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
            {(['standard', 'urgent'] as const).map((urg) => (
              <button
                type="button"
                key={urg}
                onClick={() => setUrgency(urg)}
                class={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  urgency === urg
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {urg === 'standard' && (isRu ? 'Обычная' : 'Standard')}
                {urg === 'urgent' && (isRu ? 'Срочно (+30%)' : 'Fast (+30%)')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Support Period */}
      <div class="mb-6">
        <span class="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
          {isRu ? 'Поддержка и развитие' : 'Post-launch Support'}
        </span>
        <div class="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
          {[0, 1, 3, 6].map((months) => (
            <button
              type="button"
              key={months}
              onClick={() => setSupportMonths(months)}
              class={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                supportMonths === months
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {months === 0
                ? isRu
                  ? 'Без поддержки'
                  : 'None'
                : `${months} ${isRu ? 'мес.' : 'mo.'}`}
            </button>
          ))}
        </div>
      </div>

      {/* Result Display Banner */}
      <div class="p-5 rounded-xl bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div class="text-xs text-neutral-400 uppercase tracking-wider">
            {isRu ? 'Ориентировочная вилка' : 'Estimated Range'}
          </div>
          <div
            class="text-2xl font-bold text-white tracking-tight mt-1"
            data-testid="estimate-price"
          >
            ${result.minPriceUsd.toLocaleString()} – ${result.maxPriceUsd.toLocaleString()}
          </div>
          <div class="text-xs text-emerald-400 mt-0.5" data-testid="estimate-days">
            ⏱ {result.minDays} – {result.maxDays} {isRu ? 'рабочих дней' : 'business days'}
          </div>
        </div>

        <a
          href="#lead-form"
          class="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors text-center shadow-lg shadow-emerald-500/20"
        >
          {isRu ? 'Оформить заявку' : 'Start with this'}
        </a>
      </div>
    </div>
  );
}
