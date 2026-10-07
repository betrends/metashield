import type { MetadataRoute } from "next";

const base = "https://metashield.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { url: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { url: "/",                      priority: 1.0, changeFrequency: "weekly" },
    { url: "/account-recovery",      priority: 0.9, changeFrequency: "monthly" },
    { url: "/account-protection",    priority: 0.9, changeFrequency: "monthly" },
    { url: "/account-immunity",      priority: 0.9, changeFrequency: "monthly" },
    { url: "/business-ads",          priority: 0.8, changeFrequency: "monthly" },
    { url: "/check-my-account",      priority: 0.9, changeFrequency: "weekly" },
    { url: "/recovery-eligibility",  priority: 0.8, changeFrequency: "weekly" },
    { url: "/pricing",               priority: 0.8, changeFrequency: "weekly" },
    { url: "/how-it-works",          priority: 0.7, changeFrequency: "monthly" },
    { url: "/reviews",               priority: 0.7, changeFrequency: "weekly" },
    { url: "/case-studies",          priority: 0.7, changeFrequency: "weekly" },
    { url: "/resources",             priority: 0.6, changeFrequency: "weekly" },
    { url: "/about",                 priority: 0.6, changeFrequency: "monthly" },
    { url: "/contact",               priority: 0.6, changeFrequency: "monthly" },
    { url: "/privacy",               priority: 0.3, changeFrequency: "yearly" },
    { url: "/terms",                 priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map(({ url, priority, changeFrequency }) => ({
    url: `${base}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
