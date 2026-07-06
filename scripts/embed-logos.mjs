// Regenerates src/logo.ts by base64-embedding the source images in assets/.
// The kit ships the logos inlined (no /public asset needed on install), and
// these source files are the editable originals. To update a logo: replace the
// file in assets/ and run `node scripts/embed-logos.mjs`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nwc = readFileSync(join(root, "assets/nwc-logo-white.webp")).toString("base64");
const bird = readFileSync(join(root, "assets/thebird-logo-white.png")).toString("base64");

const out = `// Bundled brand logos, embedded so the kit never depends on a /public asset.
// NWC (white) is the default for most projects; TheBird AI (white) is used on the
// rare projects done under that brand. Select one via config.brand.logo:
//   brand: { logo: "nwc" }      // default, may also be omitted
//   brand: { logo: "thebird" }  // TheBird AI
//   brand: { logo: "/my.png" }  // any other string is treated as a URL/path
// Regenerate with: node scripts/embed-logos.mjs  (sources live in assets/)
export const NWC_LOGO =
  "data:image/webp;base64,${nwc}";

export const THEBIRD_LOGO =
  "data:image/png;base64,${bird}";

// Registry of bundled logos, keyed by the short name used in config.brand.logo.
export const LOGOS: Record<string, string> = {
  nwc: NWC_LOGO,
  thebird: THEBIRD_LOGO,
};

// Resolve config.brand.logo to an <img src>. A known key ("nwc" | "thebird")
// uses the matching bundled logo; any other non-empty string is treated as a
// URL/path; omitted falls back to the NWC logo.
export function resolveLogo(logo?: string): string {
  if (!logo) return NWC_LOGO;
  return LOGOS[logo] ?? logo;
}
`;

writeFileSync(join(root, "src/logo.ts"), out);
console.log(`wrote src/logo.ts  (nwc: ${nwc.length} b64 chars, thebird: ${bird.length} b64 chars)`);
