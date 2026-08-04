'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

function sectionSlug(title: string) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sectionStorageKey(title: string) {
  return `doc-section-open:${sectionSlug(title)}`;
}

export function CollapsibleDocSection({
  title,
  children,
  defaultOpen,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const normalized = title.trim().toLowerCase();
  const contentId = `doc-section-${sectionSlug(title) || 'section'}`;
  const storageKey = sectionStorageKey(title);
  const initialOpen =
    defaultOpen ?? (normalized === 'glossary' ? false : true);
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored === '1') {
      setOpen(true);
    } else if (stored === '0') {
      setOpen(false);
    }
  }, [storageKey]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      window.sessionStorage.setItem(storageKey, next ? '1' : '0');
      return next;
    });
  }

  return (
    <section
      className={cn(
        'document-section-collapse',
        normalized === 'glossary' && 'is-glossary',
        className,
      )}
      data-section={normalized}
    >
      <button
        type="button"
        className="document-section-summary"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
      >
        <span className="document-section-summary-title">{title}</span>
        <span className="document-section-summary-meta">
          <span className="document-section-summary-hint">{open ? 'Collapse' : 'Expand'}</span>
          <ChevronDown
            size={16}
            className={cn('document-section-chevron', open && 'is-open')}
            aria-hidden
          />
        </span>
      </button>
      <div
        id={contentId}
        className={cn('document-section-body', !open && 'is-collapsed')}
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}
