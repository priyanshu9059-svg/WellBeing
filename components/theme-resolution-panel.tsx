'use client';

import Link from 'next/link';
import { ExternalLink, Phone, Shield } from 'lucide-react';
import { getThemeResolution, type ThemeResolution } from '@/config/theme-resolutions';

export function ThemeResolutionPanel({
  themeId,
  compact = false,
  title,
}: {
  themeId: string;
  compact?: boolean;
  title?: string;
}) {
  const theme: ThemeResolution = getThemeResolution(themeId);

  return (
    <section className={`theme-resolution ${compact ? 'compact' : ''}`} aria-label={`${theme.label} resolution paths`}>
      <div className="theme-resolution-head">
        <Shield size={18} />
        <div>
          <p className="kicker">{title || 'Themed resolution for this pressure'}</p>
          <h3>{theme.label}</h3>
          <p>{theme.focus}</p>
        </div>
      </div>

      {!compact && (
        <ul className="theme-helps">
          {theme.whatHelps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      <div className="theme-helpline-row">
        {theme.helplines.map((line) => (
          <a key={`${line.name}-${line.number}`} className="theme-call" href={line.href}>
            <Phone size={16} />
            <span>
              <b>{line.name}</b>
              <small>
                {line.number}
                {line.note ? ` · ${line.note}` : ''}
              </small>
            </span>
          </a>
        ))}
      </div>

      <div className="theme-portal-list">
        {theme.portals.map((portal) => {
          const external = /^https?:\/\//i.test(portal.href);
          if (external) {
            return (
              <a
                key={portal.href}
                className="theme-portal"
                href={portal.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} />
                <span>
                  <b>{portal.name}</b>
                  <small>{portal.blurb}</small>
                </span>
              </a>
            );
          }
          return (
            <Link key={portal.href} className="theme-portal" href={portal.href}>
              <ExternalLink size={15} />
              <span>
                <b>{portal.name}</b>
                <small>{portal.blurb}</small>
              </span>
            </Link>
          );
        })}
      </div>

      <Link className="btn btn-secondary theme-local-action" href={theme.localAction.href}>
        {theme.localAction.label}
      </Link>
      <p className="fine-print">
        Helplines and portals are for guidance. Verify numbers locally before relying on them in an emergency.
      </p>
    </section>
  );
}
