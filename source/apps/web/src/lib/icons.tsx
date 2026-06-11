import React from "react";
import {
  LayoutDashboard, FolderKanban, FileText, Table2, RefreshCw, ShieldCheck,
  Menu, Search, Plus, Filter, UserPlus, Paperclip, Clock, AlertTriangle,
  Save, Download, Upload, Palette, LogOut, MessageSquare, MoreHorizontal,
  ChevronDown, X, Pencil, Minus, Archive, RotateCcw, Trash2, Settings2,
} from "lucide-react";

const iconMap = {
  dashboard: LayoutDashboard,
  project: FolderKanban,
  doc: FileText,
  sheet: Table2,
  sync: RefreshCw,
  shield: ShieldCheck,
  menu: Menu,
  search: Search,
  plus: Plus,
  filter: Filter,
  user: UserPlus,
  paperclip: Paperclip,
  clock: Clock,
  alert: AlertTriangle,
  save: Save,
  import: Download,
  export: Upload,
  palette: Palette,
  logout: LogOut,
  comment: MessageSquare,
  more: MoreHorizontal,
  "chevron-down": ChevronDown,
  x: X,
  edit: Pencil,
  minus: Minus,
  archive: Archive,
  restore: RotateCcw,
  trash: Trash2,
  settings: Settings2,
} as const;

export type IconName = keyof typeof iconMap;

export function Icon({ name }: { name: IconName }) {
  const LucideIcon = iconMap[name];
  return React.createElement(LucideIcon, { size: 20, strokeWidth: 1.8, "aria-hidden": true });
}
