/** Site identity (F1b-D5, PRD G3); F2 extends with bio, socials, flags. `url` is the RFC 2606 placeholder until Q8 is decided; F12 enforces replacing it. */
export interface NavLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  /** Origin only, no trailing slash (e.g. "https://example.com"). */
  url: string;
  description: string;
  nav: readonly NavLink[];
}

export const siteConfig: SiteConfig = {
  name: "Samir Shrestha",
  url: "https://example.com",
  description: "Personal site of Samir Shrestha: projects, writing, and how to get in touch.",
  nav: [
    { label: "Projects", href: "/projects/" },
    { label: "Blog", href: "/blog/" },
    { label: "About", href: "/about/" },
    { label: "Resume", href: "/resume/" },
  ],
};
