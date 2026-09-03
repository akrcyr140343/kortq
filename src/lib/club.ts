// Permanent club invite — the "QR ก๊วน" the whole club shares to let friends
// sign in. This is a fixed asset, not per-session data.
//
// To use the club's real QR, drop the image at `public/club-qr.png` (any square
// QR works). Until that file exists the panel falls back to the join code, which
// friends can type in instead — so nothing breaks before the image is added.

export const CLUB_NAME = "คนดีตีแบด";

/** Short code shown under the QR (friends can type this instead of scanning). */
export const CLUB_JOIN_CODE = "4LJ46H57";

/** Square QR image for the club. Replace the file to change the destination. */
export const CLUB_QR_SRC = "/club-qr.png";
