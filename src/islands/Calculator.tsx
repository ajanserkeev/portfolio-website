import { useEffect, useState } from 'preact/hooks';
import { defaultPricingTable } from '../data/pricing';
import { bus, type PainId } from '../engine/events';
import type { Dict, Locale } from '../i18n';
import { type EstimateSelection, estimate } from '../lib/estimate';

interface Props {
  copy: Dict['calc'];
  locale: Locale;
}

type Complexity = NonNullable<EstimateSelection['complexity']>;
type Urgency = NonNullable<EstimateSelection['urgency']>;

const SERVICES = ['agents', 'crm', 'booking', 'web'] as const;
const COMPLEXITY: readonly Complexity[] = ['simple', 'medium', 'enterprise'];
const URGENCY: readonly Urgency[] = ['standard', 'urgent'];
const SUPPORT_MONTHS = [0, 1, 3, 6] as const;

export default function Calculator({ copy, locale }: Props) {
  const [pain, setPain] = useState<PainId>('lost-leads');
  const [services, setServices] = useState<string[]>(
    defaultPricingTable.painDefaults['lost-leads'],
  );
  const [complexity, setComplexity] = useState<Complexity>('medium');
  const [urgency, setUrgency] = useState<Urgency>('standard');
  const [supportMonths, setSupportMonths] = useState<number>(1);

  // The pain picked on the roof preselects the matching services.
  useEffect(
    () =>
      bus.on('capsule:selected', (event) => {
        setPain(event.pain);
        setServices(defaultPricingTable.painDefaults[event.pain]);
      }),
    [],
  );

  const toggleService = (id: string) => {
    if (!services.includes(id)) setServices([...services, id]);
    else if (services.length > 1) setServices(services.filter((s) => s !== id));
  };

  const result = estimate(
    { pain, services, complexity, urgency, supportMonths },
    defaultPricingTable,
  );
  const money = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 0,
  });

  return (
    <div class="ui-panel" id="project-calculator" data-testid="calculator">
      <h3 class="ui-panel__title">{copy.title}</h3>
      <p class="ui-panel__lead">{copy.lead}</p>

      <div class="ui-section">
        <span class="ui-label">{copy.services}</span>
        <div class="ui-tiles">
          {SERVICES.map((id) => (
            <button
              type="button"
              key={id}
              class="ui-tile"
              aria-pressed={services.includes(id)}
              onClick={() => toggleService(id)}
            >
              <span>{copy.serviceNames[id]}</span>
              <span class="ui-check" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div class="ui-section ui-grid ui-grid--2">
        <div>
          <span class="ui-label">{copy.scale}</span>
          <div class="ui-segmented">
            {COMPLEXITY.map((level) => (
              <button
                type="button"
                key={level}
                aria-pressed={complexity === level}
                onClick={() => setComplexity(level)}
              >
                {copy.scaleNames[level]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span class="ui-label">{copy.urgency}</span>
          <div class="ui-segmented">
            {URGENCY.map((level) => (
              <button
                type="button"
                key={level}
                aria-pressed={urgency === level}
                onClick={() => setUrgency(level)}
              >
                {copy.urgencyNames[level]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div class="ui-section">
        <span class="ui-label">{copy.support}</span>
        <div class="ui-segmented">
          {SUPPORT_MONTHS.map((months) => (
            <button
              type="button"
              key={months}
              aria-pressed={supportMonths === months}
              onClick={() => setSupportMonths(months)}
            >
              {months === 0 ? copy.supportNone : `${months} ${copy.months}`}
            </button>
          ))}
        </div>
      </div>

      <div class="ui-result">
        <div>
          <div class="ui-result__label">{copy.result}</div>
          <div class="ui-result__value" data-testid="estimate-price">
            ${money.format(result.minPriceUsd)} – ${money.format(result.maxPriceUsd)}
          </div>
          <div class="ui-result__meta" data-testid="estimate-days">
            {result.minDays}–{result.maxDays} {copy.days}
          </div>
        </div>
        <a class="ui-btn ui-btn--accent" href="#lead-form">
          {copy.cta}
        </a>
      </div>
    </div>
  );
}
