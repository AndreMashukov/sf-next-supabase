'use client';

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type DropdownMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  menuClassName?: string;
  stopPropagation?: boolean;
};

export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  className,
  menuClassName,
  stopPropagation = false,
}: DropdownMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function positionMenu() {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root || !menu) {
        return;
      }

      const rect = root.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 4}px`;
      if (align === 'end') {
        menu.style.left = `${Math.max(8, rect.right - menu.offsetWidth)}px`;
      } else {
        menu.style.left = `${Math.max(8, rect.left)}px`;
      }
    }

    const frame = window.requestAnimationFrame(positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  }, [open, align, children]);

  function handleRootClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (stopPropagation) {
      event.stopPropagation();
    }
  }

  return (
    <div ref={rootRef} className={className} onClick={handleRootClick}>
      {trigger}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              className={`folder-card-menu dropdown-menu-portal${menuClassName ? ` ${menuClassName}` : ''}`}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
