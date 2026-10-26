import { defaultLocale, type Locale } from "./config";
import { createT, type T } from "./translate";

// The language switch was removed from the site, so everyone sees English.
// (The French text in ./fr is kept in case the switch comes back; an old
// "lang" cookie from the switch is now ignored so nobody gets stuck in
// French without a way back.)
export async function getLocale(): Promise<Locale> {
  return defaultLocale;
}

// For server components and generateMetadata: `const t = await getT();`
export async function getT(): Promise<T> {
  return createT(await getLocale());
}
