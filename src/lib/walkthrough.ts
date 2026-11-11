import { FunnelType } from '@/types/database';

// The welcome walkthrough a client watches the first time they sign in: what each scene
// shows and the line spoken over it. The same lines are the on-screen captions.
//
// Voiceover: drop one audio file per scene into
//   public/onboarding/voiceover/<cam|vsl|webinar>/01.mp3, 02.mp3, ...
// and the walkthrough plays them in step with the scenes. Without the files it runs on a
// timer with captions only.

export type SceneKind =
    | 'welcome'
    | 'model'
    | 'onboarding'
    | 'call'
    | 'research'
    | 'build'
    | 'record'
    | 'timeline'
    | 'questions';

export interface WalkthroughScene {
    kind: SceneKind;
    eyebrow: string;
    title: string;
    voiceover: string; // spoken line, also the caption
    items?: string[];
    badge?: string;
    note?: string;
}

export interface Walkthrough {
    variant: 'cam' | 'vsl' | 'webinar';
    name: string; // what we are building, in the client's words
    scenes: WalkthroughScene[];
}

const ONBOARDING_ITEMS = [
    'Watch the worksheet fill-up guide',
    'Open your Google Drive folder',
    'Fill in the onboarding worksheet',
    'Share your logo',
    'Share photos, testimonials and case studies',
    'Give Meta ad account access',
    'Give payment gateway access',
    'Share your domain DNS access',
];

const TIMELINE = ['Onboarding', 'Strategy · 3 days', 'Your approval', 'Build · 5 working days', 'Quality check', 'Launch'];

export function buildWalkthrough(funnelType?: FunnelType | null): Walkthrough {
    const variant = funnelType === 'VSL' ? 'vsl' : funnelType === 'Webinar' ? 'webinar' : 'cam';
    const cam = variant === 'cam';
    const webinar = variant === 'webinar';
    const name = cam ? 'Community Ascension Model' : webinar ? 'Webinar Funnel' : 'VSL Funnel';

    // What goes to the client for sign-off, and what gets built after it
    const forApproval = cam ? 'course outline' : webinar ? 'landing page copy and webinar script' : 'landing page copy and VSL script';
    const buildItems = cam
        ? ['Course slide decks', 'Bonus assets', 'Sales page and copy', 'VSL and ad scripts', 'Image ads', 'Community and LMS', 'Funnel and payments']
        : webinar
            ? ['Video ad scripts', 'Image ads', 'Landing and thank-you pages', 'Zoom integration', 'Nurture and reminders']
            : ['Video ad scripts', 'Image ads', 'Landing, VSL and thank-you pages', 'Calendar integration', 'Qualification form', 'Nurture and reminders'];
    const recordItems = cam
        ? ['Your course lessons', 'Your VSL', 'Your video ads']
        : webinar
            ? ['Your webinar', 'Your video ads']
            : ['Your VSL', 'Your video ads'];

    const scenes: WalkthroughScene[] = [
        {
            kind: 'welcome',
            eyebrow: 'Welcome',
            title: 'Welcome to ASR Media Pro',
            voiceover: `Welcome to ASR Media Pro. In the next minute and a half, here is how we will build your ${name} together.`,
        },
        {
            kind: 'model',
            eyebrow: 'The model',
            title: cam ? 'One course. One community. One clear path up.' : 'One funnel, built to bring you booked calls',
            items: cam
                ? ['Low-ticket course', 'Community', 'High-ticket programme']
                : webinar
                    ? ['Ad', 'Landing page', 'Webinar', 'Sale']
                    : ['Ad', 'Landing page', 'VSL', 'Booked call'],
            voiceover: cam
                ? 'Buyers start with a low-ticket course, join your community, and the right ones move up into your high-ticket programme.'
                : webinar
                    ? 'Your ads bring people to a landing page, they register and watch your webinar, and the right ones buy.'
                    : 'Your ads bring people to a landing page, they watch your VSL, and the right ones book a call with you.',
        },
        {
            kind: 'onboarding',
            eyebrow: 'Your first step',
            title: 'Complete your onboarding',
            items: ONBOARDING_ITEMS,
            voiceover:
                'It starts with you. Watch the short fill-up guide, open your Drive folder, and complete the onboarding worksheet. Then share your logo, photos, testimonials and case studies, and give us access to your Meta ad account, payment gateway and domain.',
        },
        {
            kind: 'call',
            eyebrow: 'Kick-off',
            title: 'Then we meet on a welcome call',
            voiceover: 'Once your onboarding is complete, we meet on a welcome call. Right after that, our work begins.',
        },
        {
            kind: 'research',
            eyebrow: 'What we do first',
            title: `Research, then your ${forApproval}`,
            items: ['Market research', 'Audience research', 'Competitor research'],
            badge: 'Within 3 working days',
            note: `Your ${forApproval} comes to you for approval`,
            voiceover: `We study your market, your audience and your competitors. Within three working days, your ${forApproval} ${cam ? 'reaches' : 'reach'} you for approval.`,
        },
        {
            kind: 'build',
            eyebrow: 'After you approve',
            title: 'We build everything',
            items: buildItems,
            badge: '5 working days after approval',
            voiceover: cam
                ? 'Once you approve, we build it all in five working days: your course slide decks and bonuses, the sales page and copy, your VSL and ad scripts, image ads, your community and LMS, and the full funnel.'
                : 'Once you approve, we build it all in five working days: your ad scripts, image ads, every funnel page, the integrations and your follow-up sequences.',
        },
        {
            kind: 'record',
            eyebrow: 'Your part',
            title: 'You record. We give you everything you need.',
            items: recordItems,
            note: 'Scripts, slide decks, recording guidelines and reference videos are shared with you',
            voiceover: cam
                ? 'Your part is recording: your course, your VSL and your video ads. We give you the scripts, the slide decks, clear recording guidelines and references.'
                : `Your part is recording: ${webinar ? 'your webinar' : 'your VSL'} and your video ads. We give you the scripts, clear recording guidelines and references.`,
        },
        {
            kind: 'timeline',
            eyebrow: 'The timeline',
            title: 'Live in about 14 days',
            items: TIMELINE,
            note: 'Faster feedback and approvals from you mean an earlier launch',
            voiceover:
                'After a full quality check, we set up your ad account and launch your ads. Start to finish, the project takes about fourteen days, and quick approvals from you keep it moving.',
        },
        {
            kind: 'questions',
            eyebrow: 'We are with you',
            title: 'Questions? Message us on your WhatsApp group',
            voiceover: 'Any question, at any point, just message us on your WhatsApp group. Now let us begin your onboarding.',
        },
    ];

    return { variant, name, scenes };
}

// How long a scene stays up when there is no voiceover file to time it by.
export const sceneDuration = (scene: WalkthroughScene) =>
    Math.max(5500, scene.voiceover.split(/\s+/).length * 370 + 1800);

export const voiceoverUrl = (variant: Walkthrough['variant'], index: number) =>
    `/onboarding/voiceover/${variant}/${String(index + 1).padStart(2, '0')}.mp3`;
