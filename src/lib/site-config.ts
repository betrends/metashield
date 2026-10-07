// Central place for brand name + navigation so the placeholder brand
// (and any nav changes) only need to be edited in one file.
//
// TODO before launch: replace `brandName` with the real, registered
// business name once it's finalized.

export const brandName = "MetaShield";
export const brandTagline = "Account Recovery Services & Advanced Protection";

export const contact = {
  email: "bethetrendsng@gmail.com",
  phone: "+234 911 021 4417",
  whatsapp: "https://wa.me/2349110214417",
  instagram: "https://instagram.com/metashield",
  address: "Lagos, Nigeria",
};

export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export const servicesNav: NavLink[] = [
  {
    label: "Account Recovery",
    href: "/account-recovery",
    description: "Disabled, suspended, restricted or hacked accounts.",
  },
  {
    label: "Account Protection",
    href: "/account-protection",
    description: "Health checks, risk scoring and ongoing monitoring.",
  },
  {
    label: "Business & Ad Accounts",
    href: "/business-ads",
    description: "Meta Business Manager and advertising account issues.",
  },
];

export const primaryNav: NavLink[] = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Resources", href: "/resources" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const footerNav = {
  services: servicesNav,
  company: [
    { label: "About", href: "/about" },
    { label: "Case Studies", href: "/case-studies" },
    { label: "Reviews", href: "/reviews" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Resources", href: "/resources" },
    { label: "Contact", href: "/contact" },
  ],
  tools: [
    { label: "Check My Account", href: "/check-my-account" },
    { label: "Recovery Eligibility Checker", href: "/recovery-eligibility" },
    { label: "Client Portal", href: "/portal" },
    { label: "Pricing", href: "/pricing" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};
