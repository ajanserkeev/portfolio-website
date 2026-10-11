import type { Dict } from './index';

export const en = {
  brand: 'Tower',
  meta: {
    title: 'Tower — Automation, AI Agents and Web Development Studio',
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
  chat: { open: 'Open the AI agent chat', label: 'AI agent' },
  actions: {
    'toggle-agent': 'Switch the agent on',
    'open-chat': 'Message the agent',
    'run-deal': 'Run a deal',
    'open-booking': 'Pick a call slot',
    'next-stage': 'Next stage: mockup → code → live',
    'test-capsule': 'Send a capsule to the desk',
  },
  menu: { label: 'Menu' },
  sound: { on: 'Turn sound on', off: 'Turn sound off' },
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
  cases: {
    heading: 'Featured projects',
    viewCase: 'View case study',
    backToTower: 'Back to the tower',
    allCases: 'All cases',
    ndaBadge: 'Confidential (NDA)',
    stackTitle: 'Technology stack',
    resultsTitle: 'Measurable results',
  },
  process: {
    title: 'How we work',
    lead: 'No endless meetings or bloated estimates: from discovery to live production in 4 clear steps.',
    steps: [
      {
        kicker: 'Step 1',
        title: 'Discovery & architecture',
        desc: 'We analyze your workflows, calculate implementation ROI, and prepare a strict technical specification.',
      },
      {
        kicker: 'Step 2',
        title: 'Prototype in 7 days',
        desc: 'Within a week, we deliver the first working scenario of your AI agent or a clickable web app prototype.',
      },
      {
        kicker: 'Step 3',
        title: 'Development & integration',
        desc: 'We write clean code, integrate your CRM, configure knowledge vectors, and train your operational team.',
      },
      {
        kicker: 'Step 4',
        title: 'Launch & ongoing support',
        desc: 'We deploy to production, monitor conversion metrics, and expand functionality as your business scales.',
      },
    ],
  },
  team: {
    title: 'Team at the console',
    lead: 'We are three founders. You work directly with the engineers architecting your system and writing the code.',
    members: [
      {
        name: 'Aman',
        role: 'Architecture & AI Agents',
        bio: 'Designs autonomous agents, LLM pipelines, and dialogue intent classification systems.',
      },
      {
        name: 'Artyom',
        role: 'UI, 3D & Design',
        bio: 'Oversees Blender 3D art, art direction, and mobile WebGL performance in Three.js.',
      },
      {
        name: 'Daniyar',
        role: 'CRM, Backend & Automation',
        bio: 'Integrates databases, payment processing, n8n workflows, and ERP systems.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    lead: 'Everything you need to know about partnering with our studio before kicking off a project.',
    items: [
      {
        q: 'How much does development cost and what are typical timelines?',
        a: 'Targeted solutions (AI agents or booking widgets) launch in 1–2 weeks. Comprehensive platforms take 3–6 weeks. Budgets are fixed upfront in the agreement.',
      },
      {
        q: 'What if an AI agent makes a mistake or hallucinates?',
        a: 'We implement rigorous guardrails and grounding constraints: agents only draw from verified knowledge bases. Any out-of-scope query escalates smoothly to a human operator.',
      },
      {
        q: 'Do you work under Non-Disclosure Agreements (NDA)?',
        a: 'Yes. We sign mutual NDAs before receiving sensitive business documentation, CRM access, or customer datasets.',
      },
      {
        q: 'How are payments and quality guarantees structured?',
        a: 'We work under formal agreements with milestone payments and provide an included warranty period for bug fixes after deployment.',
      },
    ],
  },
  legal: {
    privacy: 'Privacy Policy',
    consent: 'Personal Data Processing Consent',
    copyright: '© 2026 Tower. All rights reserved.',
  },
} satisfies Dict;
