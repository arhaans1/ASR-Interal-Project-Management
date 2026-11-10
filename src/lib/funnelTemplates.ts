import { DueAnchor, FunnelType, TaskOwner } from '@/types/database';

// ---------------------------------------------------------------------------
// Funnel types
// ---------------------------------------------------------------------------

export const FUNNEL_TYPES: { value: FunnelType; label: string; longName: string }[] = [
  { value: 'VSL', label: 'VSL Funnel', longName: 'VSL Funnel' },
  { value: 'Webinar', label: 'Webinar Funnel', longName: 'Webinar Funnel' },
  { value: 'CAM', label: 'CAM Funnel', longName: 'Community Ascension Model' },
];

export const funnelLongName = (type?: FunnelType | null) =>
  FUNNEL_TYPES.find((f) => f.value === type)?.longName ?? 'project';

export const funnelLabel = (type?: FunnelType | null) =>
  FUNNEL_TYPES.find((f) => f.value === type)?.label ?? null;

// ---------------------------------------------------------------------------
// Task templates — pre-listed on a new client card when a funnel type is picked.
// Wording follows the "Total Deliverables" section of the On-Boarding Worksheet.
// ---------------------------------------------------------------------------

export interface TemplateTask {
  name: string;
  owner: TaskOwner;
  is_onboarding?: boolean;
  is_approval?: boolean;
  task_key?: string;
}

export interface TemplateCategory {
  name: string;
  tasks: TemplateTask[];
  // Timeline rule: due this many business days after onboarding is complete,
  // or after the client's approval.
  due_after?: DueAnchor;
  due_days?: number;
}

const step = (task_key: string, name: string): TemplateTask => ({
  name,
  owner: 'client',
  is_onboarding: true,
  task_key,
});
const asr = (name: string): TemplateTask => ({ name, owner: 'team' });
const clientTask = (task_key: string, name: string): TemplateTask => ({
  name,
  owner: 'client',
  task_key,
});

// Everything we need from the client before work can start. Shared by every funnel type.
const CLIENT_ONBOARDING: TemplateCategory = {
  name: 'Client Onboarding',
  tasks: [
    step('watch_video', 'Watch the Start Here video'),
    step('fill_worksheet', 'Fill in the On-Boarding Worksheet'),
    step('upload_logo', 'Upload your logo'),
    step('upload_images', 'Upload your photos'),
    step('upload_testimonials', 'Upload testimonials & case studies'),
    step('meta_access', 'Give us Meta Ads access'),
    step('domain_access', 'Share your domain login or DNS access'),
    step('payment_gateway', 'Share your Razorpay keys or login'),
  ],
};

// CAM timeline: research, strategy and the course outline are due 3 business days after
// onboarding. The client then reviews and approves the outline, and everything else is
// due 5 business days after that approval.
const CAM_TEMPLATE: TemplateCategory[] = [
  CLIENT_ONBOARDING,
  {
    name: 'Research, Strategy & Course Outline',
    due_after: 'onboarding',
    due_days: 3,
    tasks: [
      asr('Conduct market research'),
      asr('Conduct audience and customer research'),
      asr('Develop positioning'),
      asr('Create the CAM offer architecture'),
      asr('Create the course outline (modules, value bombs, and bonuses)'),
    ],
  },
  {
    name: 'Client Approval',
    tasks: [
      {
        name: 'Review and approve the course outline',
        owner: 'client',
        is_approval: true,
        task_key: 'approve_course_outline',
      },
    ],
  },
  {
    name: 'Course Creation',
    due_after: 'approval',
    due_days: 5,
    tasks: [
      asr('Create the recording-ready course package'),
      asr('Create module PowerPoints'),
      asr('Create all bonus assets'),
    ],
  },
  {
    name: 'Copy & Creatives',
    due_after: 'approval',
    due_days: 5,
    tasks: [
      asr('Write the complete sales-page copy'),
      asr('Create lifecycle email / WhatsApp nurture'),
      asr('Create product mockups and page graphics'),
      asr('Create image ads'),
      asr('Create video-ad scripts'),
    ],
  },
  {
    name: 'Build & Setup',
    due_after: 'approval',
    due_days: 5,
    tasks: [
      asr('Set up Community & LMS'),
      asr('Build the funnel pages & payment gateway integration'),
      asr('Complete QA and submit everything'),
    ],
  },
  {
    name: 'Recording & Launch',
    tasks: [
      clientTask('record_video_ads', 'Record and edit your video ads'),
      clientTask('record_course_videos', 'Record your course videos'),
      asr('Launch ad campaigns'),
    ],
  },
];

const VSL_TEMPLATE: TemplateCategory[] = [
  CLIENT_ONBOARDING,
  {
    name: 'Copy & Creatives',
    tasks: [
      asr('Landing page copy'),
      asr('VSL script'),
      asr('Video ad scripts'),
      asr('Image ads'),
    ],
  },
  {
    name: 'Funnel Build',
    tasks: [
      asr('Full funnel design (LP, VSL, thank you)'),
      asr('Calendar integration'),
      asr('Qualification form with DQ logic'),
      asr('Nurture and reminder sequences'),
    ],
  },
  {
    name: 'Launch',
    tasks: [asr('Ad launch')],
  },
];

const WEBINAR_TEMPLATE: TemplateCategory[] = [
  CLIENT_ONBOARDING,
  {
    name: 'Copy & Creatives',
    tasks: [
      asr('Webinar landing page copy'),
      asr('Webinar script & PPT'),
      asr('Video ad scripts'),
      asr('Image ads'),
    ],
  },
  {
    name: 'Funnel Build',
    tasks: [
      asr('Full funnel design (LP, thank you)'),
      asr('Zoom integration'),
      asr('Nurture and reminder sequences'),
    ],
  },
  {
    name: 'Launch',
    tasks: [asr('Ad launch')],
  },
];

export const FUNNEL_TEMPLATES: Record<FunnelType, TemplateCategory[]> = {
  CAM: CAM_TEMPLATE,
  VSL: VSL_TEMPLATE,
  Webinar: WEBINAR_TEMPLATE,
};

export const templateTaskCount = (type: FunnelType) =>
  FUNNEL_TEMPLATES[type].reduce((n, c) => n + c.tasks.length, 0);

// ---------------------------------------------------------------------------
// Guided steps — what the client sees for each known task_key in the portal.
// ---------------------------------------------------------------------------

// ASR Media Pro's Meta Business Portfolio ID, which clients add as a partner.
export const META_PARTNER_ID = '510878439923195';

export type StepLinkSource = 'drive' | 'video' | 'form';

export interface StepAction {
  label: string;
  // Either a fixed URL, or a link stored on the client card.
  url?: string;
  source?: StepLinkSource;
  primary?: boolean;
}

export interface StepGuide {
  eyebrow: string;
  summary: string;
  bullets?: string[];
  numbered?: boolean;
  actions?: StepAction[];
  note?: string;
  where?: string; // Folder path inside the client's Drive
  embedVideo?: boolean;
  copyValue?: { label: string; value: string };
  doneLabel: string;
}

export const STEP_GUIDES: Record<string, StepGuide> = {
  watch_video: {
    eyebrow: 'Start here',
    summary:
      'A short walkthrough of how your project works, where everything lives, and what we need from you. Please watch it before you fill in the worksheet.',
    embedVideo: true,
    actions: [{ label: 'Open video in a new tab', source: 'video' }],
    doneLabel: "I've watched the video",
  },
  fill_worksheet: {
    eyebrow: 'About you and your business',
    summary:
      'This is where you tell us about you, your business and your offer. Please fill in every part you can — the more you share, the better everything we build for you will be.',
    bullets: [
      'General information: name, email, WhatsApp number and address',
      'Core information: your offer, target audience, competitors, mechanism and founder story',
      'Your low-ticket and high-ticket deliverables, with pricing and bonuses',
      'Any old funnel assets: webinar or VSL recordings, decks and sales-call recordings',
    ],
    actions: [
      { label: 'Open the worksheet', source: 'form', primary: true },
      { label: 'Watch the fill-up guide', url: 'https://lp.asrmediapro.com/cam-onboarding-fillup' },
    ],
    where: 'On-Boarding Worksheet · main folder',
    doneLabel: "I've filled in the worksheet",
  },
  upload_logo: {
    eyebrow: 'Brand assets',
    summary:
      'Upload your logo so we can use it across your ads, pages and community. The highest-quality file you have is best — PNG with a transparent background, or SVG.',
    actions: [{ label: 'Open your Drive folder', source: 'drive', primary: true }],
    where: '02 Clients Assets › Logos',
    doneLabel: "I've uploaded my logo",
  },
  upload_images: {
    eyebrow: 'Brand assets',
    summary:
      'Add clear photos of you for the "About" and "Meet the founder" sections of your pages. A mix of professional and natural shots works well.',
    actions: [{ label: 'Open your Drive folder', source: 'drive', primary: true }],
    where: '02 Clients Assets › Coach Images',
    doneLabel: "I've uploaded my photos",
  },
  upload_testimonials: {
    eyebrow: 'Proof',
    summary:
      'Share as many testimonials and case studies as you can. Any format is fine — screenshots, videos, voice notes or written reviews.',
    actions: [{ label: 'Open your Drive folder', source: 'drive', primary: true }],
    where: '02 Clients Assets › Testimonials',
    doneLabel: "I've uploaded my testimonials",
  },
  meta_access: {
    eyebrow: 'Access',
    summary:
      'Add ASR Media Pro as a partner on your Meta Business account so we can set up and run your ads.',
    numbered: true,
    bullets: [
      'Open Business Settings › Partners using the button below.',
      'Click Partners → Add → Give a partner access to your assets.',
      'Enter our Business ID (copy it below).',
      'Under Pages, select your page and switch on everything under Full Control.',
      'Under Instagram Accounts, select your account and give all permissions.',
      'Repeat for Ad Accounts and Datasets. If these do not exist yet, skip them — we will create them.',
      'Click Invite.',
    ],
    copyValue: { label: 'ASR Media Pro Business ID', value: META_PARTNER_ID },
    actions: [
      { label: 'Open Meta partner settings', url: 'https://business.facebook.com/settings/partners', primary: true },
      { label: 'Watch the video guide', url: 'https://youtube.com/clip/UgkxvouoMATllKyLDYLAa4aRHPhCTRYOFGDl?si=JrlhGctPoL5aOLNs' },
      { label: 'No Business Manager yet?', url: 'https://www.youtube.com/watch?v=Xtu8S0BWlZI&t=0s' },
    ],
    note: 'Access to both your Facebook Page and your Instagram account is mandatory.',
    doneLabel: "I've given Meta access",
  },
  domain_access: {
    eyebrow: 'Access',
    summary:
      'We need to connect your domain to your funnel pages. In the "Domain Details" section of the worksheet, add your domain name and the login for where you bought it (GoDaddy, Hostinger, Namecheap and so on).',
    bullets: [
      'Prefer not to share a login? Tell your project manager and we will send you the DNS records to add yourself.',
    ],
    actions: [{ label: 'Open the worksheet', source: 'form', primary: true }],
    where: 'On-Boarding Worksheet › Domain Details',
    doneLabel: "I've shared domain access",
  },
  payment_gateway: {
    eyebrow: 'Access',
    summary:
      'So buyers can pay on your pages, add your Razorpay Key ID and Secret in the "Payment Gateway Details" section of the worksheet.',
    bullets: [
      'Not sure where to find the keys? Share your Razorpay login instead and our team will get them.',
    ],
    actions: [{ label: 'Open the worksheet', source: 'form', primary: true }],
    where: 'On-Boarding Worksheet › Payment Gateway Details',
    doneLabel: "I've shared Razorpay details",
  },
  approve_course_outline: {
    eyebrow: 'Your approval',
    summary:
      'Your course outline is ready for you. Read it through and send any notes or changes to your project manager. Once you are happy with it, approve it here and we start on everything else.',
    bullets: [
      'Changes are easiest now, before the course, copy and pages are built on top of it.',
      'The rest of your project is due 5 business days after you approve.',
    ],
    actions: [{ label: 'Open your Drive folder', source: 'drive', primary: true }],
    where: '06 Low Ticket Course › Course Outline',
    doneLabel: 'I approve the course outline',
  },
  record_video_ads: {
    eyebrow: 'Recording',
    summary:
      'Record each video-ad script we have written for you: vertical 9:16, on your phone, with a clip-on mic and your face well lit. Read the Recording Guidelines in your folder first.',
    actions: [{ label: 'Open your Drive folder', source: 'drive', primary: true }],
    where: '01 Ads › Video Ads',
    doneLabel: "I've uploaded my video ads",
  },
  record_course_videos: {
    eyebrow: 'Recording',
    summary:
      'Record your lessons using the course outline as your map, then upload each one into its module folder. Name each file like "Module 1 - Lesson 2 - Lesson Name".',
    actions: [{ label: 'Open your Drive folder', source: 'drive', primary: true }],
    where: '06 Low Ticket Course › Modules',
    doneLabel: "I've uploaded my course videos",
  },
};

export const FALLBACK_GUIDE: StepGuide = {
  eyebrow: 'Your action',
  summary: 'Complete this step and tick it off when you are done. If anything is unclear, message your project manager.',
  actions: [{ label: 'Open your Drive folder', source: 'drive' }],
  doneLabel: 'Mark as done',
};

export const guideFor = (taskKey?: string | null): StepGuide =>
  (taskKey && STEP_GUIDES[taskKey]) || FALLBACK_GUIDE;

// Turn a share link into something an <iframe> can play. Returns null when the
// link has to be opened in a new tab instead.
export function toEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'drive.google.com') {
      const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get('id');
      return id ? `https://drive.google.com/file/d/${id}/preview` : null;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) return url;
      const id = u.searchParams.get('v') ?? u.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'loom.com') {
      const id = u.pathname.match(/\/(?:share|embed)\/([^/]+)/)?.[1];
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.match(/^\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === 'player.vimeo.com') return url;
    return null;
  } catch {
    return null;
  }
}
