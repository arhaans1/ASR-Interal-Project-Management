// The welcome video every client watches on first sign-in. Hosted on Bunny Stream.
// To change the video, replace the URL below (the "src" of Bunny's embed code).
export const WELCOME_VIDEO_URL =
    'https://iframe.mediadelivery.net/embed/288658/0e998f38-03b3-4a2f-bcc3-74decec6738d?autoplay=false&loop=false&muted=false&preload=true&responsive=true';

// Bunny's player.js lets the page hear when the video ends
export const BUNNY_PLAYERJS_URL = 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js';

// A client is never locked in: Continue opens at the end of the video, or this many seconds
// after they press play, whichever comes first. If the player cannot be tracked at all, it
// opens this long after the pop-up appeared.
export const UNLOCK_AFTER_SECONDS = 80;
