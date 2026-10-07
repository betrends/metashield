import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { createT, type T } from "./translate";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

// For server components and generateMetadata: `const t = await getT();`
export async function getT(): Promise<T> {
  return createT(await getLocale());
}
