'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Archive, History, Mic, Paperclip, Pause, Play, RotateCcw, Send, Square, ThumbsDown, ThumbsUp, Trash2, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { crisisResources, HIGH_RISK_PHRASES } from '@/config/crisis-resources';
import { suggestedPrompts } from '@/mocks/data';
import { getServices } from '@/services';
import { isApiEnabled } from '@/lib/api';
import type { ChatMessage } from '@/types';
import { newId } from '@/lib/utils';

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'I’m here with you. You can share as much or as little as feels comfortable. What is on your mind?',
  createdAt: new Date().toISOString(),
};

export function ChatExperience() {
  const services = getServices();
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resources, setResources] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [synced, setSynced] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sessionId = `WBS-${useId().replace(/[^a-z0-9]/gi, '').toUpperCase()}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isApiEnabled() && services.chat.load) {
        try {
          const remote = await services.chat.load();
          if (!cancelled && remote.length) {
            setMessages(remote);
            setSynced(true);
            return;
          }
        } catch {
          /* fall back to local */
        }
      }
      try {
        const saved = localStorage.getItem('wellbeing-support:conversation');
        if (!cancelled && saved) setMessages(JSON.parse(saved));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wellbeing-support:conversation', JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(value = text) {
    const clean = value.trim();
    if (!clean || typing) return;
    const user: ChatMessage = { id: newId(), role: 'user', text: clean, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, user]);
    setText('');
    if (HIGH_RISK_PHRASES.some((p) => clean.toLowerCase().includes(p))) {
      setFlagged(true);
      return;
    }
    setTyping(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await services.chat.send(clean, controller.signal);
      setMessages((m) => [...m, reply]);
      setSynced(isApiEnabled());
    } catch (e) {
      if ((e as Error & { flagged?: boolean }).flagged) {
        setFlagged(true);
      } else if ((e as Error).name !== 'AbortError') {
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: 'assistant',
            text: 'I’m sorry—the response paused. You can try sending that again.',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setTyping(false);
      abortRef.current = null;
    }
  }

  async function clear() {
    if (services.chat.clear && isApiEnabled()) {
      try {
        const msgs = await services.chat.clear();
        setMessages(msgs);
        setConfirmClear(false);
        setFlagged(false);
        return;
      } catch {}
    }
    setMessages([welcome]);
    setConfirmClear(false);
    setFlagged(false);
  }

  function feedback(id: string, value: 'helpful' | 'not-helpful') {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, feedback: value } : x)));
    if (services.chat.feedback && isApiEnabled()) {
      void services.chat.feedback(id, value);
    }
  }

  return (
    <div className="chat-layout">
      <Card className="chat-card">
        <div className="chat-top">
          <div className="companion">
            <span>✦</span>
            <div>
              <b>A quiet conversation</b>
              <small>Support companion · not a therapist</small>
            </div>
          </div>
          <div className="row">
            <button className="icon-button" onClick={() => setHistoryOpen(true)} aria-label="Open conversation history">
              <History />
            </button>
            <button className="icon-button" onClick={() => setResources(true)} aria-label="Open support resources">
              <Archive />
            </button>
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              New conversation
            </Button>
          </div>
        </div>
        <div className="session-bar">
          <span>Anonymous session {sessionId}</span>
          <span>{synced ? 'Synced to your account' : 'Stored on this device'}</span>
        </div>
        {flagged && (
          <section className="safeguard" role="alert">
            <b>You deserve immediate support.</b>
            <p>
              Your message is still here. If you may act on these thoughts or are in immediate danger, call {crisisResources.teleManas.name} at{' '}
              {crisisResources.teleManas.number} or emergency services at {crisisResources.emergency.number}.
            </p>
            <div className="row">
              <a className="btn btn-danger" href={crisisResources.teleManas.href}>
                Call {crisisResources.teleManas.name}
              </a>
              <Link className="btn btn-secondary" href="/safety-plan">
                Open safety plan
              </Link>
              <Button variant="ghost" onClick={() => setFlagged(false)}>
                Return to conversation
              </Button>
            </div>
            <small>Keyword safeguard — requires professional validation before production.</small>
          </section>
        )}
        <div className="messages" aria-live="polite">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrap ${msg.role}`}>
              <div className="message">{msg.text}</div>
              {msg.role === 'assistant' && msg.id !== 'welcome' && (
                <div className="feedback">
                  <span>Was this helpful?</span>
                  <button onClick={() => feedback(msg.id, 'helpful')} aria-label="Helpful" className={msg.feedback === 'helpful' ? 'selected' : ''}>
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    onClick={() => feedback(msg.id, 'not-helpful')}
                    aria-label="Not helpful"
                    className={msg.feedback === 'not-helpful' ? 'selected' : ''}
                  >
                    <ThumbsDown size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="message-wrap assistant">
              <div className="message typing">
                <i />
                <i />
                <i />
                <span className="sr-only">Support companion is typing</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {messages.length < 4 && (
          <div className="prompt-chips">
            {suggestedPrompts.map((p) => (
              <button key={p} onClick={() => send(p)}>
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="composer">
          <button className="icon-button" aria-label="Attachment unavailable" title="Attachment unavailable">
            <Paperclip />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type what’s on your mind…"
            rows={1}
            aria-label="Message"
          />
          <button className="icon-button" onClick={() => setVoiceOpen(true)} aria-label="Voice mode">
            <Mic />
          </button>
          {typing ? (
            <button className="send-button stop" onClick={() => abortRef.current?.abort()} aria-label="Stop response">
              <Square />
            </button>
          ) : (
            <button className="send-button" onClick={() => send()} aria-label="Send message">
              <Send />
            </button>
          )}
        </div>
        <p className="composer-note">
          {isApiEnabled()
            ? 'Support can listen and suggest small next steps, but it cannot diagnose or replace professional care.'
            : 'Mocked support can listen and suggest small next steps, but it cannot diagnose or replace professional care.'}
        </p>
      </Card>
      {voiceOpen && (
        <VoicePanel
          onClose={() => setVoiceOpen(false)}
          onTranscript={(t) => {
            setText(t);
            setVoiceOpen(false);
          }}
        />
      )}
      {confirmClear && (
        <div className="mini-modal" role="dialog" aria-modal="true" aria-labelledby="clear-title">
          <div>
            <h3 id="clear-title">Clear this conversation?</h3>
            <p>This removes the stored messages for this session.</p>
            <div className="row">
              <Button variant="danger" onClick={clear}>
                Clear conversation
              </Button>
              <Button variant="secondary" onClick={() => setConfirmClear(false)}>
                Keep it
              </Button>
            </div>
          </div>
        </div>
      )}
      {historyOpen && (
        <Drawer title="Conversation history" onClose={() => setHistoryOpen(false)}>
          <div className="history-item">
            <b>A quiet conversation</b>
            <small>
              {messages.length} messages · current session
            </small>
          </div>
          <p className="empty-copy">New conversations will appear here.</p>
        </Drawer>
      )}
      {resources && (
        <Drawer title="Support resources" onClose={() => setResources(false)}>
          <Link className="resource-link" href="/exercises">
            Try a calming exercise <span>→</span>
          </Link>
          <Link className="resource-link" href="/safety-plan">
            Open your safety plan <span>→</span>
          </Link>
          <Link className="resource-link" href="/crisis">
            View crisis resources <span>→</span>
          </Link>
        </Drawer>
      )}
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function VoicePanel({ onClose, onTranscript }: { onClose: () => void; onTranscript: (text: string) => void }) {
  const services = getServices();
  const [state, setState] = useState<'idle' | 'recording' | 'paused' | 'stopped' | 'unsupported'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState('');
  const [signals, setSignals] = useState<Record<string, string> | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) setState('unsupported');
    return () => {
      if (recorder.current?.state === 'recording') recorder.current.stop();
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = async () => {
        const next = new Blob(chunks.current, { type: mr.mimeType });
        setBlob(next);
        setUrl(URL.createObjectURL(next));
        stream.getTracks().forEach((t) => t.stop());
        setState('stopped');
        try {
          const analysis = await services.voiceAnalysis.analyze(next);
          setSignals(analysis);
        } catch {
          setSignals({
            pace: 'Steady',
            pauses: 'Some',
            energy: 'Moderate',
            voiceActivity: 'Present',
            possibleTone: 'Reflective',
          });
        }
      };
      mr.start();
      recorder.current = mr;
      setSeconds(0);
      setState('recording');
    } catch {
      setState('unsupported');
    }
  }

  function pause() {
    if (recorder.current?.state === 'recording') {
      recorder.current.pause();
      setState('paused');
    }
  }
  function resume() {
    if (recorder.current?.state === 'paused') {
      recorder.current.resume();
      setState('recording');
    }
  }
  function stop() {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  }
  function remove() {
    if (url) URL.revokeObjectURL(url);
    setUrl('');
    setBlob(null);
    setSignals(null);
    setSeconds(0);
    setState('idle');
  }

  async function useTranscript() {
    if (blob) {
      try {
        const text = await services.voiceTranscription.transcribe(blob);
        onTranscript(text);
        return;
      } catch {}
    }
    onTranscript('I have been feeling overwhelmed lately, and I would like someone to listen.');
  }

  return (
    <div className="voice-panel">
      <div className="sheet-head">
        <div>
          <p className="kicker">Optional voice mode</p>
          <h2>Speak at your pace</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close voice mode">
          <X />
        </button>
      </div>
      <p>{isApiEnabled() ? 'Recording can be transcribed through the support API when configured.' : 'Your recording stays in this session and is not sent to a voice model.'}</p>
      {state === 'unsupported' ? (
        <div className="notice">
          <b>Voice recording is unavailable here.</b>
          <p>You can continue by typing. Check browser microphone permissions if you want to retry.</p>
          <div className="row">
            <Button onClick={() => setState('idle')}>Retry</Button>
            <Button variant="secondary" onClick={onClose}>
              Switch to typing
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={`wave ${state}`} aria-label={`Recording state: ${state}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <i key={i} style={{ height: `${18 + (i % 5) * 8}px` }} />
            ))}
          </div>
          <div className="record-time">
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')} · {state}
          </div>
          <div className="voice-controls">
            {state === 'idle' && (
              <Button onClick={start}>
                <Mic size={17} /> Start recording
              </Button>
            )}
            {state === 'recording' && (
              <>
                <Button variant="secondary" onClick={pause}>
                  <Pause size={17} /> Pause
                </Button>
                <Button onClick={stop}>
                  <Square size={17} /> Stop
                </Button>
              </>
            )}
            {state === 'paused' && (
              <>
                <Button variant="secondary" onClick={resume}>
                  <Play size={17} /> Resume
                </Button>
                <Button onClick={stop}>
                  <Square size={17} /> Stop
                </Button>
              </>
            )}
            {state === 'stopped' && (
              <>
                <audio controls src={url} />
                <Button variant="ghost" onClick={remove}>
                  <Trash2 size={17} /> Delete
                </Button>
                <Button variant="secondary" onClick={useTranscript}>
                  <Volume2 size={17} /> Use transcript
                </Button>
                <Button variant="ghost" onClick={start}>
                  <RotateCcw size={17} /> Retry
                </Button>
              </>
            )}
          </div>
          {state === 'stopped' && signals && (
            <Card className="signal-card">
              <div>
                <p className="kicker">Voice presentation — not a diagnosis.</p>
                <h3>Voice presentation</h3>
              </div>
              <dl>
                <div>
                  <dt>Speaking pace</dt>
                  <dd>{signals.pace}</dd>
                </div>
                <div>
                  <dt>Pauses</dt>
                  <dd>{signals.pauses}</dd>
                </div>
                <div>
                  <dt>Energy</dt>
                  <dd>{signals.energy}</dd>
                </div>
                <div>
                  <dt>Voice activity</dt>
                  <dd>{signals.voiceActivity}</dd>
                </div>
                <div>
                  <dt>Possible emotional tone</dt>
                  <dd>{signals.possibleTone}</dd>
                </div>
              </dl>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
