import type { LevelId } from './config';

export type PainId = 'lost-leads' | 'manual-routine' | 'need-site' | 'need-booking' | 'browsing';

export type TowerEvent =
  | { type: 'lift:moved'; position: number }
  | { type: 'level:reached'; level: LevelId }
  /** The lift stopped at a floor (passing through does not count): doors, chime. */
  | { type: 'lift:arrived'; level: LevelId }
  /** A person or a robot was tapped and reacts (`actor`: cast slot or robot name). */
  | { type: 'actor:tapped'; level: LevelId; actor: string }
  /** Where the current floor's main object is on screen (CSS px), for the HTML hint chip. */
  | { type: 'hint:moved'; level: LevelId; action: string; x: number; y: number; visible: boolean }
  | { type: 'tier:changed'; tier: 'high' | 'lite' | 'static' }
  | { type: 'capsule:selected'; pain: PainId }
  | { type: 'hotspot:activated'; level: LevelId; action: string }
  | { type: 'agent:enabled' }
  | { type: 'deal:run' }
  | { type: 'chat:open' }
  | { type: 'chat:user-message' }
  | { type: 'chat:agent-reply' }
  | { type: 'chat:tool'; tool: 'get_free_slots' | 'book_call' | 'create_lead' | 'show_case' }
  | { type: 'lead:submitted'; source: 'form' | 'chat' | 'calculator' }
  | { type: 'booking:confirmed'; slotIso: string };

export type TowerEventType = TowerEvent['type'];
export type TowerEventOf<T extends TowerEventType> = Extract<TowerEvent, { type: T }>;

type AnyHandler = (event: TowerEvent) => void;

/** Typed in-page event bus: the only link between the HTML layer, islands and the 3D engine. */
export class TowerBus {
  private readonly handlers = new Map<TowerEventType, Set<AnyHandler>>();

  on<T extends TowerEventType>(type: T, handler: (event: TowerEventOf<T>) => void): () => void {
    const set = this.handlers.get(type) ?? new Set<AnyHandler>();
    const wrapped = handler as AnyHandler;
    set.add(wrapped);
    this.handlers.set(type, set);
    return () => {
      set.delete(wrapped);
    };
  }

  emit(event: TowerEvent): void {
    for (const handler of [...(this.handlers.get(event.type) ?? [])]) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[tower] handler for ${event.type} failed`, error);
      }
    }
  }
}

export const bus = new TowerBus();
