import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  CircleCheck,
  FileText,
  Flame,
  Folder,
  FolderOpen,
  GraduationCap,
  Heart,
  Layers,
  LayoutGrid,
  Rocket,
  Sun,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const FOLDER_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#2563eb' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Stone', value: '#78716c' },
  { name: 'Warm Gray', value: '#a8a29e' },
] as const;

export const FOLDER_ICONS: Array<{ name: string; component: LucideIcon; label: string }> = [
  { name: 'Folder', component: Folder, label: 'Folder' },
  { name: 'Folder Open', component: FolderOpen, label: 'Open' },
  { name: 'Briefcase', component: Briefcase, label: 'Briefcase' },
  { name: 'Target', component: Target, label: 'Target' },
  { name: 'Zap', component: Zap, label: 'Zap' },
  { name: 'Rocket', component: Rocket, label: 'Rocket' },
  { name: 'BookOpen', component: BookOpen, label: 'Book' },
  { name: 'GraduationCap', component: GraduationCap, label: 'Grad Cap' },
  { name: 'FileText', component: FileText, label: 'File' },
  { name: 'Layers', component: Layers, label: 'Layers' },
  { name: 'Flame', component: Flame, label: 'Flame' },
  { name: 'Heart', component: Heart, label: 'Heart' },
  { name: 'BadgeCheck', component: BadgeCheck, label: 'Badge' },
  { name: 'Sun', component: Sun, label: 'Sun' },
  { name: 'CircleCheck', component: CircleCheck, label: 'Check' },
  { name: 'LayoutGrid', component: LayoutGrid, label: 'Grid' },
];

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  FOLDER_ICONS.map((icon) => [icon.name, icon.component]),
);

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[4].value;
export const DEFAULT_FOLDER_ICON = 'Folder';

/** Deterministic color/icon from directory id for backfill display. */
export function getDirectoryPresentationDefaults(directoryId: string): {
  color: string;
  icon: string;
} {
  let hash = 0;
  for (let index = 0; index < directoryId.length; index += 1) {
    hash = (hash * 31 + directoryId.charCodeAt(index)) >>> 0;
  }

  const color = FOLDER_COLORS[hash % FOLDER_COLORS.length].value;
  const icon = FOLDER_ICONS[hash % FOLDER_ICONS.length].name;
  return { color, icon };
}

export function resolveDirectoryIcon(iconName?: string | null): LucideIcon {
  return ICON_MAP[iconName ?? DEFAULT_FOLDER_ICON] ?? Folder;
}

export function resolveDirectoryColor(color?: string | null): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_FOLDER_COLOR;
}

/** Fallback document rail color from id (study-forge pattern). */
export function getDocumentFallbackColor(documentId: string): string {
  const palette = ['#22c55e', '#14b8a6', '#f97316', '#8b5cf6', '#3b82f6', '#ec4899'];
  let hash = 0;
  for (let index = 0; index < documentId.length; index += 1) {
    hash = (hash * 31 + documentId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}
