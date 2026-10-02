'use client';
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */
import { useEffect, useState } from 'react';
import { Camera, Check, Download, Mic, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadJson } from '@/lib/utils';
import { isApiEnabled } from '@/lib/api';
import { getServices } from '@/services';
import type { ContactConsent } from '@/types';

const categories = [
  ['conversation', 'Conversation history'],
  ['journal', 'Journal entries'],
  ['moods', 'Mood history'],
  ['safety-plan', 'Safety plan'],
  ['contact-consent', 'Consent preferences'],
];

export function PrivacyCenter() {
  const services = getServices();
  const [stored, setStored] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [permissions, setPermissions] = useState({ camera: 'Not checked', microphone: 'Not checked' });
  const [consent, setConsent] = useState<ContactConsent | null>(null);

  function refresh() {
    setStored(categories.filter(([key]) => localStorage.getItem(`wellbeing-support:${key}`)).map(([, name]) => name));
    try {
      const raw = localStorage.getItem('wellbeing-support:contact-consent');
      if (raw) setConsent(JSON.parse(raw));
    } catch {}
  }

  useEffect(() => {
    refresh();
    if (isApiEnabled() && services.userProfile.getConsent) {
      services.userProfile
        .getConsent()
        .then(setConsent)
        .catch(() => {});
    }
  }, []);

  async function checkPermission(name: 'camera' | 'microphone') {
    try {
      const result = await navigator.permissions.query({ name: name as PermissionName });
      setPermissions((p) => ({ ...p, [name]: result.state }));
    } catch {
      setPermissions((p) => ({ ...p, [name]: 'Unavailable' }));
    }
  }

  function clear(key: string) {
    if (key === 'full') {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('wellbeing-support:'))
        .forEach((k) => localStorage.removeItem(k));
    } else localStorage.removeItem(`wellbeing-support:${key}`);
    setConfirm(null);
    refresh();
  }

  function exportAll() {
    const data: Record<string, unknown> = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith('wellbeing-support:'))
      .forEach((k) => {
        try {
          data[k] = JSON.parse(localStorage.getItem(k) || 'null');
        } catch {}
      });
    downloadJson('wellbeing-support-local-data.json', data);
  }

  return (
    <div className="privacy-layout">
      <Card className="privacy-status">
        <div className="icon-orb">
          <Shield />
        </div>
        <div>
          <p className="kicker">Current privacy state</p>
          <h2>{consent?.anonymous === false ? 'Contact preferences saved' : 'Anonymous mode is on'}</h2>
          <p>
            {isApiEnabled()
              ? 'Your session can sync to the API while keeping consent choices explicit.'
              : 'Identity fields remain empty unless you independently choose to share details.'}
          </p>
        </div>
        <span className="status-pill">
          <Check />
          {isApiEnabled() ? 'API + local' : 'Local only'}
        </span>
      </Card>
      <div className="content-grid">
        <Card>
          <p className="kicker">Your choices</p>
          <h2>Consent status</h2>
          <div className="consent-status">
            <div>
              <span>Contact consent</span>
              <b>{consent?.allowContact ? 'Granted' : 'Not granted by default'}</b>
            </div>
            <div>
              <span>Wellbeing-summary consent</span>
              <b>{consent?.allowWellbeingSummary ? 'Granted' : 'Not granted by default'}</b>
            </div>
          </div>
          <a href="/wellbeing" className="text-link">
            Review consent choices →
          </a>
        </Card>
        <Card>
          <p className="kicker">Browser permissions</p>
          <h2>Camera and microphone</h2>
          <div className="permission-row">
            <Camera />
            <span>Camera</span>
            <b>{permissions.camera}</b>
            <button onClick={() => checkPermission('camera')}>Check</button>
          </div>
          <div className="permission-row">
            <Mic />
            <span>Microphone</span>
            <b>{permissions.microphone}</b>
            <button onClick={() => checkPermission('microphone')}>Check</button>
          </div>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <p className="kicker">On this device</p>
            <h2>Locally stored data</h2>
          </div>
          <Button variant="secondary" onClick={exportAll}>
            <Download />
            Export all local data
          </Button>
        </div>
        {stored.length ? (
          <div className="stored-list">
            {stored.map((x) => (
              <span key={x}>
                <Check />
                {x}
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No support data has been saved yet.</p>
        )}
        <p className="fine-print">LocalStorage is device-level browser storage. Server copies (when API is enabled) follow retention rules on the backend.</p>
      </Card>
      <Card className="danger-zone">
        <p className="kicker">Clear local data</p>
        <h2>Choose what to remove</h2>
        <div className="clear-grid">
          <Button variant="secondary" onClick={() => setConfirm('conversation')}>
            Clear conversation history
          </Button>
          <Button variant="secondary" onClick={() => setConfirm('journal')}>
            Clear journal
          </Button>
          <Button variant="secondary" onClick={() => setConfirm('moods')}>
            Clear mood history
          </Button>
          <Button variant="danger" onClick={() => setConfirm('full')}>
            <Trash2 />
            Clear full session
          </Button>
        </div>
      </Card>
      <Card>
        <p className="kicker">Data sharing and retention</p>
        <h2>What the backend stores</h2>
        <p>
          With the API enabled, conversations, mood, journal, safety plans, consents, appointments, and counsellor requests can sync to the database under your session. Crisis phone links still require an explicit click; nothing auto-dispatches emergency services.
        </p>
      </Card>
      {confirm && (
        <div className="mini-modal">
          <div>
            <h3>Remove this local data?</h3>
            <p>This action removes the selected data from this browser.</p>
            <div className="row">
              <Button variant="danger" onClick={() => clear(confirm)}>
                Remove data
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
