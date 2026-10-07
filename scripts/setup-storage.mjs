// One-time setup: creates the "documents" Storage bucket used by the
// portal's Document Center. Safe to re-run — it's a no-op if the bucket
// already exists.
//
// Usage: node scripts/setup-storage.mjs
// Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local not found — rely on already-exported env vars instead.
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Failed to list buckets:", listError.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === "documents")) {
  console.log("✓ 'documents' bucket already exists — nothing to do.");
  process.exit(0);
}

const { error: createError } = await supabase.storage.createBucket("documents", {
  public: false,
  fileSizeLimit: "20MB",
});

if (createError) {
  console.error("Failed to create bucket:", createError.message);
  process.exit(1);
}

console.log("✓ Created private 'documents' Storage bucket.");
