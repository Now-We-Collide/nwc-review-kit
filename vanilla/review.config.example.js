// Copy this onto your static site (e.g. as review.config.js) and include it
// BEFORE nwc-review-kit.js. Same shape as the React kit's ReviewConfig.
// Remove both <script> lines before porting to HubSpot.
window.NWC_REVIEW_CONFIG = {
  projectId: "my-site",                                  // unique per site; namespaces its comments
  supabaseUrl: "https://fqwvgmkexczmulglowyb.supabase.co",
  supabaseAnonKey: "sb_publishable_ysrEfTmjafve6prmuYIi3A_IfmkOgsU", // publishable key (safe to ship)
  brand: { name: "Now We Collide", logo: "nwc", accent: "#4ae0f9" }, // logo: "nwc" | "thebird" | a URL
  bar: { position: "side", autoHide: true },             // "side" | "top"
  slate: { dashboardLabel: "Website Review Dashboard", title: "My Site", client: "Client", version: "v0.1", status: "For review" },
  pages: [
    { key: "home", label: "Home", basePath: "/home",
      options: [ { slug: "1", label: "Option 1", descriptor: "alt layout" }, { slug: "2", label: "Option 2" } ],
      status: { design: { label: "In review", tone: "good" }, copy: { label: "Placeholder", tone: "todo" } } },
    { key: "about", label: "About", basePath: "/about", href: "/about", options: [ { slug: "", label: "About" } ] }
  ]
};
