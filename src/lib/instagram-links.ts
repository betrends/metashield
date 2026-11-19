// Links in the protection checklist email open the Instagram APP, not the
// browser. Email apps often block app-only links (instagram://), so the
// email links to our own page (/go/instagram?step=…), which opens the app
// straight away and shows what to tap for that step.

export type InstagramStep = "selfie" | "birthday" | "devices" | "contacts" | "two_factor" | "guidelines" | "center";

// title: the step. path: what to tap in the app. tip: a line under the taps.
// web / webLabel: the browser fallback for people without the app.
export type InstagramStepInfo = { title: string; path: string[]; web: string; webLabel?: string; tip?: string };

export const INSTAGRAM_STEPS: Record<InstagramStep, InstagramStepInfo> = {
  selfie: {
    title: "Add your verification selfie",
    path: ["Profile", "☰ Menu", "Accounts Center", "Password and security", "Add your verification selfie"],
    web: "https://accountscenter.instagram.com/password_and_security/",
  },
  birthday: {
    title: "Check your date of birth",
    path: ["Profile", "☰ Menu", "Accounts Center", "Personal details", "Birthday"],
    web: "https://accountscenter.instagram.com/personal_info/",
  },
  devices: {
    title: "Remove devices you don't recognise",
    path: ["Profile", "☰ Menu", "Accounts Center", "Password and security", "Where you're logged in"],
    web: "https://accountscenter.instagram.com/password_and_security/",
    tip: "Log out of any phone or computer you don't know.",
  },
  contacts: {
    title: "Check your email and phone number",
    path: ["Profile", "☰ Menu", "Accounts Center", "Personal details", "Contact info"],
    web: "https://accountscenter.instagram.com/personal_info/",
    tip: "Each of your accounts must use its own email and its own phone number. 4 accounts = 4 different emails and 4 different phone numbers.",
  },
  two_factor: {
    title: "Turn on two-factor authentication",
    path: ["Profile", "☰ Menu", "Accounts Center", "Password and security", "Two-factor authentication"],
    web: "https://accountscenter.instagram.com/password_and_security/",
    tip: "Use an authenticator app or text message, so nobody can log in with just your password.",
  },
  guidelines: {
    title: "Keep your posts within Instagram's guidelines",
    path: ["Profile", "☰ Menu", "More info and support", "Account Status"],
    web: "https://help.instagram.com/477434105621119",
    webLabel: "Read Instagram's Community Guidelines in the browser",
    tip: "Account Status shows if anything you posted goes against Instagram's Community Guidelines. Keep every post, reel and story within the guidelines.",
  },
  center: {
    title: "Open Accounts Center",
    path: ["Profile", "☰ Menu", "Accounts Center"],
    web: "https://accountscenter.instagram.com/",
  },
};

export function isInstagramStep(v: unknown): v is InstagramStep {
  return typeof v === "string" && v in INSTAGRAM_STEPS;
}

export function instagramStepLink(siteUrl: string, step: InstagramStep): string {
  return `${siteUrl.replace(/\/$/, "")}/go/instagram?step=${step}`;
}

// App links: iPhone opens instagram://; Android uses an intent that falls
// back to the website when the app isn't installed.
export const IG_APP_IOS = "instagram://app";
export function igAppAndroid(fallback: string): string {
  return `intent://app#Intent;scheme=instagram;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}
