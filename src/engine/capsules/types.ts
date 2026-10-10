export type CapsuleChannel = 'whatsapp' | 'telegram' | 'instagram' | 'default';

export const CHANNEL_COLORS: Record<CapsuleChannel, string> = {
  whatsapp: '#25D366',
  telegram: '#229ED9',
  instagram: '#E1306C',
  default: '#FF5A1F',
};

export interface LaunchCapsuleOptions {
  channel?: CapsuleChannel;
  color?: string;
  fromY?: number;
  toY?: number;
  durationSec?: number;
}
