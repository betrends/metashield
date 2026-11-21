import type { InstagramStep } from "@/lib/instagram-links";

// The compulsory protection steps — shown in the protection checklist email
// and on the client dashboard, so both always list the same things.
// ig: which step of our /go/instagram page opens the Instagram APP and shows
// what to tap (lib/instagram-links.ts).
export type ChecklistStep = { title: string; how: string; ig: InstagramStep; icon: string };

export const CHECKLIST_DO: ChecklistStep[] = [
  {
    title: "Add your verification selfie",
    how: "This helps Meta confirm the account is yours if it is ever flagged.",
    ig: "selfie",
    icon: "🤳",
  },
  {
    title: "Make sure your date of birth is correct",
    how: "Check it matches your real date of birth.",
    ig: "birthday",
    icon: "🎂",
  },
  {
    title: "Remove devices you don't recognise",
    how: "Check every phone and computer logged in to your account and log out any you don't know.",
    ig: "devices",
    icon: "📱",
  },
  {
    title: "Use a different email and phone number for each account",
    how: "If you have 4 accounts, use 4 different email addresses and 4 different phone numbers — never share one between accounts.",
    ig: "contacts",
    icon: "✉️",
  },
  {
    title: "Turn on two-factor authentication",
    how: "Use an authenticator app or text message, so nobody can log in with just your password.",
    ig: "two_factor",
    icon: "🔐",
  },
  {
    title: "Only post content that follows Instagram's guidelines",
    how: "Keep every post, reel and story within Instagram's Community Guidelines. Account Status shows if anything you posted goes against them.",
    ig: "guidelines",
    icon: "📋",
  },
];
