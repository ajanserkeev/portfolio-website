export function createTelegramDeepLink(username: string, payload?: string): string {
  const cleanUser = username.replace(/^@/, '');
  if (!payload) {
    return `https://t.me/${cleanUser}`;
  }
  const sanitized = payload.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return `https://t.me/${cleanUser}?start=${sanitized}`;
}

export function createWhatsAppDeepLink(phoneNumber: string, message?: string): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  if (!message) {
    return `https://wa.me/${cleanPhone}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
