'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof FileText;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className={`sidebar-nav-item${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <span className="sidebar-nav-item-icon">
        <Icon size={18} />
      </span>
      <span className="sidebar-nav-item-text">{label}</span>
    </Link>
  );
}

export function Sidebar({
  userEmail,
  isOpen,
  onClose,
}: {
  userEmail: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const avatarLabel = useMemo(() => {
    if (!userEmail) {
      return '?';
    }
    return userEmail.charAt(0).toUpperCase();
  }, [userEmail]);

  const isDocumentsActive =
    pathname === '/documents' || pathname.startsWith('/directories/');
  const isRulesActive = pathname === '/rules' || pathname.startsWith('/rules/');

  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {isMobile && isOpen ? (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside className={`sidebar${isOpen ? '' : ' collapsed'}`} aria-label="Main navigation">
        <div className="sidebar-scroll">
          <div className="sidebar-section-label">Navigation</div>
          <nav className="sidebar-nav" aria-label="Navigation">
            <NavItem
              href="/documents"
              label="My Directories"
              icon={FileText}
              active={isDocumentsActive}
              onClick={isMobile ? onClose : undefined}
            />
            <NavItem
              href="/rules"
              label="Rules Manager"
              icon={Sparkles}
              active={isRulesActive}
              onClick={isMobile ? onClose : undefined}
            />
          </nav>
        </div>

        {userEmail ? (
          <div className="sidebar-footer">
            <div className="sidebar-avatar">{avatarLabel}</div>
            {isOpen ? (
              <div className="sidebar-profile">
                <span className="sidebar-profile-email">{userEmail}</span>
                <span className="sidebar-profile-label">Signed in</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </>
  );
}
