import { en } from './en';
import { ru } from './ru';

export type Locale = 'ru' | 'en';

type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };
export type Dict = Widen<typeof ru>;

const dictionaries: Record<Locale, Dict> = { ru, en };

export function dict(locale: Locale): Dict {
  return dictionaries[locale];
}
