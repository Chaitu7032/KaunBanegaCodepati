// ============================================================
// KAUN BANEGA CODEPATHI — Mentimeter room configuration
//
// >>> REPLACE THESE FOUR PLACEHOLDER LINKS WITH THE REAL MENTIMETER LINKS <<<
//
// This is the ONLY file you need to edit to point the site at the
// real, live Menti rooms. Each participant on the /join page picks
// one of these four rooms — do not add, remove, or reorder entries
// without also updating the labels below.
// ============================================================

export const MENTI_LINK_1 = "https://www.menti.com/alzazwjg7y2g";
export const MENTI_LINK_2 = "https://www.menti.com/al612jdn2rim";
export const MENTI_LINK_3 = "https://www.menti.com/REPLACE_ME_3";
export const MENTI_LINK_4 = "https://www.menti.com/REPLACE_ME_4";

// Array form used by the /join page to render the four room cards.
// Editing the four constants above automatically updates this list —
// you should not need to touch anything below this line.
export const MENTI_ROOMS = [
  { id: 1, label: "MENTI ROOM 1", cta: "JOIN MENTI 1", url: MENTI_LINK_1 },
  { id: 2, label: "MENTI ROOM 2", cta: "JOIN MENTI 2", url: MENTI_LINK_2 },
  { id: 3, label: "MENTI ROOM 3", cta: "JOIN MENTI 3", url: MENTI_LINK_3 },
  { id: 4, label: "MENTI ROOM 4", cta: "JOIN MENTI 4", url: MENTI_LINK_4 },
];
