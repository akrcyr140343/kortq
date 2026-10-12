/**
 * Surface presets — the class names live in globals.css (`.card`, …) so the
 * look is edited in one place; these constants only name the intent at the
 * call site.
 *
 *   CARD        the workhorse: white, 2px warm outline, solid ledge underneath
 *   CARD_LIVE   a game on court — the only teal-edged card
 *   CARD_NEXT   the game that goes on court next — sun-edged
 *   CARD_DASHED an open slot / a place to arrange something
 */
export const CARD = "card";
export const CARD_LIVE = "card card-live";
export const CARD_NEXT = "card card-next";
export const CARD_DASHED = "card-dashed";
