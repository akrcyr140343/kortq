/**
 * Elevation presets.
 *
 * Three levels, and they are meant to stay three: a card that needs to shout
 * gets promoted, it does not get a bespoke shadow. The shadow values live in
 * globals.css (`.e1` / `.e2` / `.e3` / `.e-live`) so the ramp is edited in one
 * place; these constants only name the intent at the call site.
 *
 *   E1  page furniture — stat band, section shells, form fields
 *   E2  the working surfaces — court cards, queue panel
 *   E3  things that float over the page — modals
 *   LIVE a court mid-game; the only surface with an emerald glow
 */
export const E1 = "e1";
export const E2 = "e2";
export const E3 = "e3";
export const LIVE = "e-live";
