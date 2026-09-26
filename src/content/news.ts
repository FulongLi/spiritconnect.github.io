export type NewsItem = {
  /** display date, e.g. "MAY 19, 2026" */
  date: string;
  text: string;
};

/** Company news, newest first. Shown on the About page. */
export const NEWS_ITEMS: NewsItem[] = [
  {
    date: "MAY 19, 2026",
    text: "AI-assisted converter design workflow updated, covering device selection, loss estimation, thermal assessment, and validation.",
  },
  {
    date: "APR 30, 2026",
    text: "Partnership established with PanXin Technology to develop a power device library for AI-driven power electronics design automation.",
  },
  {
    date: "MAR 5, 2026",
    text: "Power Electronics AI Agent vision announced: an intelligent design partner across device, converter, and system levels.",
  },
  {
    date: "JAN 5, 2026",
    text: "Brand update and website relaunch: Spirit Connect AIPE Labs adopted its expanded AI-powered engineering identity.",
  },
  {
    date: "DEC 19, 2025",
    text: "Spirit Connect Fantasy website launched for future imagination, digital art, storytelling, novels, and creative visual experiences.",
  },
  {
    date: "OCT 28, 2025",
    text: "Official website launched, sharing AI-assisted power electronics design capabilities, research resources, and technical insights.",
  },
  {
    date: "OCT 1, 2025",
    text: "Spirit Connect AIPE Labs founded to accelerate power electronics innovation through AI-driven design automation.",
  },
  {
    date: "JUN 9, 2025",
    text: "Spirit Connect founded and registered as the parent organization supporting future technology and innovation initiatives.",
  },
];
