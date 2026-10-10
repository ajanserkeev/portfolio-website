import type { Dict } from './index';

export const en = {
  brand: '[Studio]',
  meta: {
    title: '[Studio] — AI agents, CRM, automation and websites',
    description:
      'A studio of three developers: AI agents for WhatsApp, Telegram and Instagram, CRM and process automation, websites, web apps and booking engines.',
  },
  hero: {
    kicker: 'Roof · Inbox',
    title: 'There are three of us. As many agents as you need.',
    lead: 'Your business gets hundreds of messages a day. We build systems that reply, book and sell — while you run the business.',
    primary: 'Ride down the tower',
    secondary: 'Discuss a project',
  },
  levels: {
    roof: {
      short: 'R',
      name: 'Roof',
      title: 'Inbox',
      lead: 'Messages from WhatsApp, Telegram, Instagram and your website pour in around the clock.',
    },
    agents: {
      short: '4',
      name: 'Floor 4',
      title: 'AI agent dispatch room',
      lead: 'Agents answer customers in WhatsApp, Telegram and Instagram, qualify leads and book appointments — 24/7.',
    },
    crm: {
      short: '3',
      name: 'Floor 3',
      title: 'Sorting hall: CRM and processes',
      lead: 'Leads land in your CRM and reach the right manager on their own, while invoices, payments and reminders go out without manual routine.',
    },
    booking: {
      short: '2',
      name: 'Floor 2',
      title: 'Calendar hall: booking',
      lead: 'Online booking for hotels, tours, clinics and salons — with payments, reminders and calendar sync.',
    },
    workshop: {
      short: '1',
      name: 'Floor 1',
      title: 'Workshop: websites and web apps',
      lead: 'Fast websites and web apps that sell and are easy to grow.',
    },
    basement: {
      short: 'B',
      name: 'Basement',
      title: 'Control room: the team and contact',
      lead: 'Three people run the whole tower. Tell us about your task — we reply within one business day.',
    },
  },
  panel: { label: 'Tower floors' },
  cta: { discuss: 'Discuss a project' },
  mode: { toStatic: 'No-3D mode', toLive: 'Turn on 3D' },
  lang: { switchTo: 'RU', href: '/', hreflang: 'ru' },
  pains: {
    title: 'What is your main challenge?',
    badge: 'This is for you',
    options: {
      'lost-leads': 'Losing leads in messengers',
      'manual-routine': 'Team buried in manual routine',
      'need-site': 'Need a site or web app',
      'need-booking': 'Need online booking',
      browsing: 'Just exploring',
    },
  },
} satisfies Dict;
