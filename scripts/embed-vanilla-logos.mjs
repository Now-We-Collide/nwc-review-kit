// Injects the base64 logo data URIs from assets/ into vanilla/nwc-review-kit.js,
// replacing the __NWC_LOGO__ / __THEBIRD_LOGO__ / __THEBIRD_ICON__ placeholders.
// Run after editing the vanilla kit's logic, or when a logo changes:
//   node scripts/embed-vanilla-logos.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const b64 = (p) => readFileSync(join(root, p)).toString("base64");
const nwc = "data:image/webp;base64," + b64("assets/nwc-logo-white.webp");
const bird = "data:image/png;base64," + b64("assets/thebird-logo-white.png");
const birdIcon = "data:image/png;base64," + b64("assets/thebird-icon-white.png");

const file = join(root, "vanilla/nwc-review-kit.js");
let src = readFileSync(file, "utf8");
src = src.replace(/"__NWC_LOGO__"/, JSON.stringify(nwc))
         .replace(/"__THEBIRD_LOGO__"/, JSON.stringify(bird))
         .replace(/"__THEBIRD_ICON__"/, JSON.stringify(birdIcon));
writeFileSync(file, src);
console.log("embedded logos into vanilla/nwc-review-kit.js");
