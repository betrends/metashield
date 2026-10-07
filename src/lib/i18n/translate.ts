import type { Locale } from "./config";
import { fr } from "./fr";

export type TranslateVars = Record<string, string | number>;
export type T = (text: string | undefined, vars?: TranslateVars) => string;

// Keys are the English text itself. Whitespace is collapsed on both sides
// so text copied from multi-line JSX still matches.
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

const dictionaries: Record<Locale, Map<string, string> | null> = {
  en: null,
  fr: new Map(Object.entries(fr).map(([k, v]) => [normalize(k), v])),
};

const warned = new Set<string>();

// Plain figures like "10,000 – 15,000" or "₦120,000": French uses a space
// as the thousands separator (a comma there reads as a decimal point).
const FIGURE = /^[₦$€\d,.\s–\-+%]+$/;
function frenchFigures(text: string) {
  return text.replace(/(\d),(?=\d{3}\b)/g, "$1\u202f");
}

function interpolate(text: string, vars?: TranslateVars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m,
  );
}

export function createT(locale: Locale): T {
  const dict = dictionaries[locale];
  return (text, vars) => {
    if (text === undefined) return "";
    if (!dict) return interpolate(text, vars);
    const key = normalize(text);
    if (locale === "fr" && FIGURE.test(key)) return interpolate(frenchFigures(text), vars);
    const hit = dict.get(key);
    if (hit === undefined && process.env.NODE_ENV === "development" && !warned.has(key)) {
      warned.add(key);
      console.warn(`[i18n] Missing ${locale} translation: "${key}"`);
    }
    // Missing translations fall back to English rather than breaking.
    return interpolate(hit ?? text, vars);
  };
}
