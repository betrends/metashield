// Short testimonial quotes for the homepage marquee. Anonymized/illustrative,
// consistent with the Case Studies template.
// TODO before launch: replace with real, permissioned client testimonials.

export type Review = {
  name: string;
  role: string;
  platform: string;
  outcome: string;
  quote: string;
  // Set once real video testimonials are recorded — the Reviews page
  // renders a video card automatically when this is present.
  videoUrl?: string;
};

export const reviews: Review[] = [
  {
    name: "Amaka O.",
    role: "Boutique owner",
    platform: "Instagram",
    outcome: "Restored",
    quote: "My business page was disabled overnight. Nine days later I was back — with a clear timeline the whole way through.",
  },
  {
    name: "David K.",
    role: "Performance marketer",
    platform: "Meta Ads",
    outcome: "Restored",
    quote: "Mid-campaign ad account restriction could've cost us the month. They had it resolved before we lost momentum.",
  },
  {
    name: "Ngozi B.",
    role: "Content creator",
    platform: "Facebook",
    outcome: "Restored",
    quote: "I'd appealed twice myself and got nowhere. Having someone track the case end to end made all the difference.",
  },
  {
    name: "Tunde A.",
    role: "Agency founder",
    platform: "Meta Business",
    outcome: "Restored",
    quote: "Multiple ad accounts, multiple admins — a genuinely complex case. Regular updates meant I never had to chase.",
  },
  {
    name: "Chiamaka E.",
    role: "E-commerce owner",
    platform: "Instagram",
    outcome: "Restored",
    quote: "The health check flagged a risk two weeks before it became a real problem. That warning alone was worth it.",
  },
  {
    name: "Femi S.",
    role: "Brand manager",
    platform: "Meta Ads",
    outcome: "Restored",
    quote: "Straightforward process, told me exactly what documents were needed, submitted correctly the first time.",
  },
];
