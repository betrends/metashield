import { redirect } from "next/navigation";

// "Account Immunity" and "Account Protection" were the same service
// described two different ways — consolidated into one page to avoid
// confusing duplicate offerings. This redirect keeps any existing links
// working.
export default function AccountImmunityRedirect() {
  redirect("/account-protection#subscriptions");
}
