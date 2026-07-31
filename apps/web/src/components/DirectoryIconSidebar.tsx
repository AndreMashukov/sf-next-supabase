'use client';

import {
  Box,
  Bot,
  Brain,
  FileText,
  Layers,
  ListOrdered,
  MessageSquare,
  Network,
  Presentation,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DirectoryPanelType =
  | 'sources'
  | 'quizzes'
  | 'cards'
  | 'slides'
  | 'diagrams'
  | 'sequence'
  | 'worlds'
  | 'chat'
  | 'agent'
  | 'rules';

const CONTENT_ITEMS: Array<{ panel: DirectoryPanelType; label: string; icon: LucideIcon }> = [
  { panel: 'sources', label: 'Sources', icon: FileText },
  { panel: 'quizzes', label: 'Quizzes', icon: Brain },
  { panel: 'cards', label: 'Cards', icon: Layers },
  { panel: 'slides', label: 'Slides', icon: Presentation },
  { panel: 'diagrams', label: 'Diagrams', icon: Network },
  { panel: 'sequence', label: 'Sequence', icon: ListOrdered },
  { panel: 'worlds', label: 'Worlds', icon: Box },
  { panel: 'chat', label: 'Chat', icon: MessageSquare },
  { panel: 'agent', label: 'Agent', icon: Bot },
];

const SETTINGS_ITEMS: Array<{ panel: DirectoryPanelType; label: string; icon: LucideIcon }> = [
  { panel: 'rules', label: 'Rules', icon: Settings },
];

function RailButton({
  label,
  icon: Icon,
  panel,
  activePanel,
  onPanelChange,
}: {
  label: string;
  icon: LucideIcon;
  panel: DirectoryPanelType;
  activePanel: DirectoryPanelType;
  onPanelChange: (panel: DirectoryPanelType) => void;
}) {
  const isActive = activePanel === panel;
  return (
    <button
      type="button"
      className={`directory-rail-button${isActive ? ' active' : ''}`}
      aria-label={label}
      aria-pressed={isActive}
      onClick={() => onPanelChange(panel)}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

export function DirectoryIconSidebar({
  activePanel,
  onPanelChange,
}: {
  activePanel: DirectoryPanelType;
  onPanelChange: (panel: DirectoryPanelType) => void;
}) {
  return (
    <nav className="directory-icon-sidebar" aria-label="Directory content">
      <div className="directory-rail-group">
        {CONTENT_ITEMS.map((item) => (
          <RailButton key={item.panel} {...item} activePanel={activePanel} onPanelChange={onPanelChange} />
        ))}
      </div>
      <div className="directory-rail-divider" />
      <div className="directory-rail-group">
        {SETTINGS_ITEMS.map((item) => (
          <RailButton key={item.panel} {...item} activePanel={activePanel} onPanelChange={onPanelChange} />
        ))}
      </div>
    </nav>
  );
}
