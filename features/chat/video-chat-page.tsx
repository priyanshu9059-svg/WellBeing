'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Play, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VideoConversationPanel } from './chat-experience';
import { getServices } from '@/services';
import type { ConversationRecording } from '@/services';

export function VideoChatPage() {
  const services = getServices();
  const [recordings, setRecordings] = useState<ConversationRecording[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await services.recordings.list();
        if (!cancelled) setRecordings(saved);
      } catch {}
    })();
    return () => {
      cancelled = true;
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function preview(recording: ConversationRecording) {
    if (previewUrls[recording.id]) {
      setPreviewing(previewing === recording.id ? null : recording.id);
      return;
    }
    try {
      const blob = await services.recordings.get(recording.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrls((current) => ({ ...current, [recording.id]: url }));
      setPreviewing(recording.id);
    } catch {}
  }

  async function removeRecording(id: string) {
    try {
      await services.recordings.remove(id);
      if (previewUrls[id]) URL.revokeObjectURL(previewUrls[id]);
      setPreviewUrls((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setRecordings((current) => current.filter((recording) => recording.id !== id));
      setPreviewing((current) => current === id ? null : current);
    } catch {}
  }

  function addRecording(recording: { id: string; filename: string; sizeBytes: number; createdAt?: string }) {
    setRecordings((current) => [{ ...recording, mimeType: 'video/webm' }, ...current.filter((item) => item.id !== recording.id)]);
  }

  return (
    <div className="video-chat-page">
      <div className="video-chat-heading">
        <div>
          <Link className="back-link" href="/chat"><ArrowLeft size={16} /> Back to conversation</Link>
          <p className="kicker">Private video conversation</p>
          <h2>Talk with Dr. Mira</h2>
          <p>Share what is happening at your own pace. The AI support agent listens during the call, while you keep control of the recording.</p>
        </div>
        <div className="video-chat-badge"><Video size={18} /> Video Chat</div>
      </div>

      <VideoConversationPanel
        onRecordingSaved={addRecording}
        onRecordingDeleted={(id) => setRecordings((current) => current.filter((recording) => recording.id !== id))}
      />

      <section className="recorded-conversations" aria-labelledby="recorded-title">
        <div className="recorded-heading">
          <div><p className="kicker">Your archive</p><h2 id="recorded-title">Recorded conversations</h2></div>
          <small>{recordings.length} saved {recordings.length === 1 ? 'recording' : 'recordings'}</small>
        </div>
        {recordings.length === 0 ? (
          <Card className="recorded-empty"><Video size={22} /><p>Your saved video conversations will appear here after you stop recording.</p></Card>
        ) : (
          <div className="recorded-list">
            {recordings.map((recording) => (
              <Card className="recorded-item" key={recording.id}>
                <div className="recorded-item-icon"><Video size={20} /></div>
                <div className="recorded-item-info"><b>{recording.filename}</b><small><CalendarDays size={13} /> {recording.createdAt ? new Date(recording.createdAt).toLocaleString() : 'Saved recording'} · {Math.ceil(recording.sizeBytes / 1024)} KB</small></div>
                <div className="recorded-item-actions">
                  <Button variant="secondary" onClick={() => void preview(recording)}><Play size={15} /> {previewing === recording.id ? 'Hide preview' : 'Preview'}</Button>
                  <Button variant="danger" onClick={() => void removeRecording(recording.id)}><Trash2 size={15} /> Remove</Button>
                </div>
                {previewing === recording.id && previewUrls[recording.id] && <video className="recorded-preview" controls autoPlay src={previewUrls[recording.id]} />}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
