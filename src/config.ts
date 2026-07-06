/*
  NWC Review Kit — configuration.
  This is the ONE file you edit per website. Set the project id, your
  Supabase details, the brand, and the pages. Everything else reads
  from here.
*/

export type Tone = "good" | "warn" | "todo";
export type Status = { label: string; tone: Tone };

export type ReviewOption = {
  slug: string; // path segment, e.g. "1" -> /policy/1 ; "" for single-page tabs
  label: string;
  descriptor?: string; // 1-2 word descriptor shown in the dropdown
  ready?: boolean;
};

export type ReviewPage = {
  key: string;
  label: string;
  basePath: string; // e.g. "/policy"
  href?: string; // explicit tab target (overrides basePath/slug)
  options: ReviewOption[];
  status?: { design?: Status; copy?: Status }; // shown on the slate
};

// Where the review nav sits. "top" is the classic bar (good early on, before the
// client's own site has a nav). "side" is a right-edge rail that collapses to a
// slim strip and expands on hover/click — use it once the site has its own nav,
// so there aren't two competing top bars.
export type BarPosition = "top" | "side";

export type ReviewConfig = {
  projectId: string; // unique per website; namespaces comments in the shared DB
  supabaseUrl: string;
  supabaseAnonKey: string; // publishable/anon key (safe to ship; access via RLS)
  brand: {
    name: string;
    // OPTIONAL. Selects the logo shown in the bar.
    //   "nwc"      -> bundled NWC logo (default, may also be omitted)
    //   "thebird"  -> bundled TheBird AI logo
    //   any other  -> treated as a URL/path to your own served logo
    logo?: "nwc" | "thebird" | (string & {});
    accent: string; // hex, used for the comment button + pins + slate
  };
  // OPTIONAL. Controls the review nav. Omit for the default top bar.
  bar?: {
    position?: BarPosition; // "top" (default) | "side"
    autoHide?: boolean; // top bar only: hide on scroll down, reveal on scroll up / mouse-to-top. Default true.
  };
  slate: {
    dashboardLabel: string; // e.g. "Website Review Dashboard"
    title: string; // project title, e.g. "FSC Website Redesign"
    client: string;
    version: string;
    status: string; // e.g. "For review"
  };
  pages: ReviewPage[];
};

/* ---- EDIT BELOW PER WEBSITE ---- */
export const reviewConfig: ReviewConfig = {
  projectId: "fsc-website",
  supabaseUrl: "https://fqwvgmkexczmulglowyb.supabase.co",
  supabaseAnonKey: "sb_publishable_ysrEfTmjafve6prmuYIi3A_IfmkOgsU",
  brand: {
    name: "Now We Collide",
    // logo is OPTIONAL. Omit it (as below) to use the kit's bundled NWC logo —
    // no /public asset required. Only set it to a real, served URL/path if you
    // want to override the bundled logo (a non-existent path renders broken).
    // logo: "/your-logo.png",
    accent: "#4ae0f9",
  },
  slate: {
    dashboardLabel: "Website Review Dashboard",
    title: "FSC Website Redesign",
    client: "Financial Services Council",
    version: "v0.4",
    status: "For review",
  },
  pages: [
    {
      key: "home",
      label: "Home",
      basePath: "/home",
      options: [
        { slug: "1", label: "Option 1", descriptor: "alternating background" },
        { slug: "2", label: "Option 2", descriptor: "white background" },
      ],
      status: { design: { label: "Design in review", tone: "good" }, copy: { label: "Copy placeholder", tone: "todo" } },
    },
    {
      key: "policy",
      label: "Policy",
      basePath: "/policy",
      options: [
        { slug: "1", label: "Option 1", descriptor: "card hub" },
        { slug: "2", label: "Option 2", descriptor: "editorial" },
      ],
      status: { design: { label: "Design in review", tone: "good" }, copy: { label: "Copy partial", tone: "warn" } },
    },
    {
      key: "events",
      label: "Events",
      basePath: "/events",
      options: [
        { slug: "1", label: "Option 1", descriptor: "list view" },
        { slug: "2", label: "Option 2", descriptor: "calendar view" },
      ],
      status: { design: { label: "Design in review", tone: "good" }, copy: { label: "Client copy", tone: "good" } },
    },
  ],
};
