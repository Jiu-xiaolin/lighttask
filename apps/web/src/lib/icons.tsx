import React from "react";

export const icons = {
  dashboard: "M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z",
  project: "M3.5 7h6.2l2 2H20v9.5H3.5z M8 14l2 2 4.5-5",
  doc: "M7 3.8h7l3 3V20H7z M14 3.8V8h4M9 12h6M9 15h6M9 18h4",
  sheet: "M4 5h16v14H4zM4 10h16M4 15h16M9.5 5v14M14.5 5v14",
  sync: "M5 6.5h12v8H9l-4 3z M17 9l3 3-3 3",
  shield: "M12 4l7 3v5c0 4.3-2.6 7-7 8-4.4-1-7-3.7-7-8V7z M9 12l2 2 4-4",
  menu: "M4 6h16M4 12h16M4 18h16",
  search: "M10.5 5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z M15 15l5 5",
  plus: "M12 5v14M5 12h14",
  filter: "M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z",
  user: "M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3.5 19c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5 M17 8v6M14 11h6",
  paperclip: "M8 12.5l5.7-5.7a3.2 3.2 0 1 1 4.5 4.5l-7.4 7.4a4.6 4.6 0 1 1-6.5-6.5l7-7",
  clock: "M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z M12 8v4l3 2",
  alert: "M12 4l9 16H3z M12 9v5M12 17h.1",
  save: "M5 4h12l2 2v14H5z M8 4v6h8V4M8 20v-6h8v6",
  import: "M12 4v10 M8 10l4 4 4-4 M5 18h14",
  export: "M12 14V4 M8 8l4-4 4 4 M5 18h14",
  palette: "M12 4a8 8 0 0 0 0 16h1.2a2 2 0 0 0 0-4H12a1.8 1.8 0 0 1 0-3.6h2a6 6 0 0 0-2-8.4z M7.5 11h.1M9 7.5h.1M13 7h.1",
  logout: "M9 5H5v14h4 M14 8l4 4-4 4 M18 12H8",
  comment: "M5 6.5h14v9H9l-4 3z",
  more: "M6 12h.1M12 12h.1M18 12h.1",
  "chevron-down": "M6 9l6 6 6-6",
  x: "M18 6L6 18M6 6l12 12",
  edit: "M13 4l5 5L7 20H3v-4zM13 4l3-3a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4L17 8",
  minus: "M5 12h14"
} as const;

export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons[name]} /></svg>;
}
