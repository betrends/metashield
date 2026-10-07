// French translations, keyed by the exact English text used in the code.
// When you add or change English text on the public site, add the matching
// line in one of these files; anything missing simply shows in English
// (and logs a "[i18n] Missing fr translation" warning in development).
import { layout } from "./layout";
import { home } from "./home";
import { about } from "./about";
import { protection } from "./protection";
import { recovery } from "./recovery";
import { business } from "./business";
import { cases } from "./cases";
import { howitworks } from "./howitworks";
import { pricing } from "./pricing";
import { contact } from "./contact";
import { healthcheck } from "./healthcheck";
import { eligibility } from "./eligibility";
import { legal } from "./legal";

export const fr: Record<string, string> = {
  ...layout,
  ...home,
  ...about,
  ...protection,
  ...recovery,
  ...business,
  ...cases,
  ...howitworks,
  ...pricing,
  ...contact,
  ...healthcheck,
  ...eligibility,
  ...legal,
};
