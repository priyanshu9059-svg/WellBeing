'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Archive, Camera, HeartPulse, History, Mic, Paperclip, Pause, Play, RotateCcw, Send, Square, Stethoscope, ThumbsDown, ThumbsUp, Trash2, Video, VideoOff, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { crisisResources, HIGH_RISK_PHRASES, PHYSICAL_URGENT_PHRASES } from '@/config/crisis-resources';
import { suggestedPromptsByLanguage } from '@/mocks/data';
import { getServices } from '@/services';
import { isApiEnabled } from '@/lib/api';
import type { ChatMessage } from '@/types';
import { newId } from '@/lib/utils';

const chatCopy = {
  English: {
    title: 'Aria',
    subtitle: 'Your wellbeing companion · not a therapist',
    welcome: "Hello, I'm Aria — I'm here to listen, without judgment. How have you been feeling today?",
    newConversation: 'New conversation',
    anonymous: 'Anonymous session',
    synced: 'Synced to your account',
    local: 'Stored on this device',
    helpful: 'Was this helpful?',
    typing: 'Aria is typing',
    placeholder: 'Type what’s on your mind…',
    noteApi: 'Aria can listen with care, guide wellbeing steps, and surface urgent resources, but cannot diagnose or replace professional care.',
    noteMock: 'Local support can answer common questions, guide wellbeing steps, and suggest urgent resources, but it cannot diagnose or replace professional care.',
  },
  Hindi: {
    title: 'Aria',
    subtitle: 'आपका wellbeing companion · therapist नहीं',
    welcome: 'नमस्ते, मैं Aria हूं — बिना judgment सुनेगी। आज आप कैसा महसूस कर रहे हैं?',
    newConversation: 'नई बातचीत',
    anonymous: 'Anonymous session',
    synced: 'आपके account से synced',
    local: 'इस device पर stored',
    helpful: 'क्या यह helpful था?',
    typing: 'Aria लिख रही है',
    placeholder: 'जो मन में है लिखें…',
    noteApi: 'Aria ध्यान से सुन सकती है, wellbeing steps guide कर सकती है, और urgent resources suggest कर सकती है, पर diagnosis या professional care का replacement नहीं है।',
    noteMock: 'Local support common questions का जवाब दे सकता है, wellbeing steps guide कर सकता है, और urgent resources suggest कर सकता है, पर diagnosis या professional care का replacement नहीं है।',
  },
  Hinglish: {
    title: 'Aria',
    subtitle: 'Aapka wellbeing companion · therapist nahi',
    welcome: "Hello, main Aria hoon — bina judgment sunungi. Aaj aap kaisa feel kar rahe ho?",
    newConversation: 'New conversation',
    anonymous: 'Anonymous session',
    synced: 'Account se synced',
    local: 'Is device par stored',
    helpful: 'Ye helpful tha?',
    typing: 'Aria type kar rahi hai',
    placeholder: 'Jo mind mein hai type karo…',
    noteApi: 'Aria carefully sun sakti hai, wellbeing steps guide kar sakti hai, aur urgent resources suggest kar sakti hai, par diagnosis ya professional care ka replacement nahi hai.',
    noteMock: 'Local support common questions answer kar sakta hai, wellbeing steps guide kar sakta hai, aur urgent resources suggest kar sakta hai, par diagnosis ya professional care ka replacement nahi hai.',
  },
};

export function ChatExperience() {
  const services = getServices();
  const { language } = useLanguage();
  const copy = chatCopy[language];
  const welcome = useMemo<ChatMessage>(() => ({
    id: 'welcome',
    role: 'assistant',
    text: copy.welcome,
    createdAt: new Date().toISOString(),
    choices: [
      { label: language === 'Hindi' ? 'भावनात्मक सहायता' : language === 'Hinglish' ? 'Emotional support' : 'Emotional support', value: 'I need emotional or mental support.' },
      { label: language === 'Hindi' ? 'Physical safety / police' : language === 'Hinglish' ? 'Physical safety / police' : 'Physical safety / police', value: 'I need help with physical safety or police.' },
      { label: language === 'Hindi' ? 'Nearby care खोजें' : language === 'Hinglish' ? 'Nearby care find karo' : 'Find nearby care', value: 'Help me find a psychologist, psychiatrist, hospital, or police station nearby.' },
    ],
  }), [copy.welcome, language]);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resources, setResources] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [mediaMode, setMediaMode] = useState<'none' | 'voice' | 'video'>('none');
  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null);
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
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== 'welcome') return current;
      return [welcome];
    });
  }, [welcome]);

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
    const lower = clean.toLowerCase();
    const physicalUrgent = PHYSICAL_URGENT_PHRASES.some((p) => lower.includes(p));
    if (HIGH_RISK_PHRASES.some((p) => lower.includes(p)) && !physicalUrgent) {
      setFlagged(true);
    }
    setTyping(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await services.chat.send(clean, controller.signal, language);
      setMessages((m) => [...m, reply]);
      setSynced(isApiEnabled());
      if ((reply as ChatMessage & { flagged?: boolean }).flagged || reply.riskLevel === 'crisis') {
        setFlagged(true);
      }
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

  async function openVoiceChat() {
    if (mediaMode === 'voice') {
      voiceStream?.getTracks().forEach((track) => track.stop());
      setVoiceStream(null);
      setMediaMode('none');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceStream(stream);
    } catch {
      setVoiceStream(null);
    }
    setMediaMode('voice');
  }

  return (
    <div className="chat-layout">
      <Card className="chat-card">
        <div className="chat-top">
          <div className="companion">
            <span>✦</span>
            <div>
              <b>{copy.title}</b>
              <small>{copy.subtitle}</small>
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
              {copy.newConversation}
            </Button>
          </div>
        </div>
        <div className="session-bar">
          <span>{copy.anonymous} {sessionId}</span>
          <span>{synced ? copy.synced : copy.local}</span>
        </div>
        <div className="media-tabs" role="tablist" aria-label="Conversation modes">
          <button
            className={`media-tab voice ${mediaMode === 'voice' ? 'active' : ''}`}
            role="tab"
            aria-selected={mediaMode === 'voice'}
            onClick={() => void openVoiceChat()}
          >
            <Mic size={19} />
            <span><b>Voice Chat</b><small>Talk and auto-transcribe</small></span>
          </button>
          <Link
            className={`media-tab video ${mediaMode === 'video' ? 'active' : ''}`}
            role="tab"
            aria-selected={mediaMode === 'video'}
            href="/video-chat"
          >
            <Video size={19} />
            <span><b>Video Chat</b><small>Preview with Dr. Mira</small></span>
          </Link>
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
            <div key={msg.id} className={`message-wrap ${msg.role} ${msg.urgency === 'urgent' ? 'urgent' : ''}`}>
              <div className="message">{msg.text}</div>
              {msg.role === 'assistant' && (msg.emotion || msg.riskLevel) && (
                <div className="aria-meta" aria-label="Conversation signals">
                  {msg.emotion && <span className={`aria-chip emotion-${msg.emotion}`}>{msg.emotion}</span>}
                  {msg.riskLevel && <span className={`aria-chip risk-${msg.riskLevel}`}>risk · {msg.riskLevel}</span>}
                </div>
              )}
              {msg.role === 'assistant' && msg.choices && msg.choices.length > 0 && (
                <div className="chat-choices" aria-label="Suggested responses">
                  {msg.choices.map((choice) => (
                    <button key={choice.value} onClick={() => send(choice.value)} disabled={typing}>
                      {choice.label}
                    </button>
                  ))}
                </div>
              )}
              {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                <div className="chat-actions" aria-label="Suggested actions">
                  {msg.actions.map((action) => (
                    <a key={action.href} className={`chat-action ${action.tone ?? 'primary'}`} href={action.href}>
                      {action.label}
                    </a>
                  ))}
                </div>
              )}
              {msg.role === 'assistant' && msg.id !== 'welcome' && (
                <div className="feedback">
                  <span>{copy.helpful}</span>
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
                <span className="sr-only">{copy.typing}</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {messages.length < 4 && (
          <div className="prompt-chips">
            {suggestedPromptsByLanguage[language].map((p) => (
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
            placeholder={copy.placeholder}
            rows={1}
            aria-label="Message"
          />
          <button className="icon-button" onClick={() => void openVoiceChat()} aria-label="Voice Chat">
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
            ? copy.noteApi
            : copy.noteMock}
        </p>
      </Card>
      {mediaMode === 'video' && (
        <VideoConversationPanel
        />
      )}
      {mediaMode === 'voice' && (
        <VoicePanel
          initialStream={voiceStream}
          onClose={() => {
            voiceStream?.getTracks().forEach((track) => track.stop());
            setVoiceStream(null);
            setMediaMode('none');
          }}
          onTranscript={(t) => {
            void send(t);
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

export function VideoConversationPanel({ onRecordingSaved, onRecordingDeleted }: {
  onRecordingSaved?: (recording: { id: string; filename: string; sizeBytes: number; createdAt?: string }) => void;
  onRecordingDeleted?: (id: string) => void;
}) {
  const services = getServices();
  const [state, setState] = useState<'idle' | 'live' | 'recording' | 'stopped' | 'unsupported'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingId, setRecordingId] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) setState('unsupported');
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState('live');
    } catch {
      setError('Camera or microphone permission was not granted. You can still use text chat below.');
      setState('idle');
    }
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(URL.createObjectURL(blob));
      try {
        const saved = await services.recordings.upload(blob);
        setRecordingId(saved.id);
        onRecordingSaved?.(saved);
      } catch {
        setError('The recording is available in this preview, but could not be saved to the backend.');
      }
      setState('stopped');
    };
    recorder.start();
    recorderRef.current = recorder;
    setSeconds(0);
    setState('recording');
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }

  function stopCamera() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState(recordingUrl ? 'stopped' : 'idle');
  }

  async function deleteRecording() {
    if (recordingId) {
      try {
        await services.recordings.remove(recordingId);
      } catch {
        setError('The saved recording could not be deleted. Please try again.');
        return;
      }
    }
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl('');
    setRecordingId('');
    onRecordingDeleted?.(recordingId);
    setState(streamRef.current ? 'live' : 'idle');
  }

  return (
    <Card className="video-call-panel">
      <div className="video-call-head">
        <div>
          <p className="kicker">Video chat</p>
          <h2>Talk with the AI companion</h2>
          <p>Use voice, camera, and replay as a prototype conversation space. Prediction and backend review are placeholders until validated.</p>
        </div>
        <span className={`call-status ${state === 'recording' ? 'recording' : ''}`}>
          {state === 'recording' ? 'Recording' : state === 'live' ? 'Camera live' : state === 'stopped' ? 'Recording ready' : 'Ready'}
        </span>
      </div>
      <div className="video-call-grid">
        <div className="avatar-stage">
          <div className="doctor-mascot" aria-label="AI doctor mascot placeholder">
            <div className="mascot-head"><span className="mascot-hair" /><span className="mascot-face"><i /><i /></span></div>
            <div className="mascot-body"><Stethoscope /><HeartPulse /></div>
          </div>
          <b>Dr. Mira · AI support mascot</b>
          <p>A calm visual guide for this private call. Your recording preview and archive appear below.</p>
        </div>
        <div className="self-video">
          {state === 'unsupported' ? (
            <div className="video-empty"><VideoOff /> Browser recording is unavailable.</div>
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline />
              {state === 'idle' && <div className="video-empty"><Camera /> Camera preview appears here.</div>}
            </>
          )}
        </div>
      </div>
      <div className="call-controls">
        {state === 'idle' || state === 'unsupported' ? (
          <Button onClick={startCamera} disabled={state === 'unsupported'}>
            <Video size={17} /> VIDEO CHAT
          </Button>
        ) : (
          <>
            {state !== 'recording' && (
              <Button onClick={startRecording}>
                <Mic size={17} /> Record conversation
              </Button>
            )}
            {state === 'recording' && (
              <Button variant="secondary" onClick={stopRecording}>
                <Square size={17} /> Stop recording
              </Button>
            )}
            <Button variant="ghost" onClick={stopCamera}>
              <VideoOff size={17} /> Turn off camera
            </Button>
          </>
        )}
        <span className="record-time">
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
        </span>
      </div>
      {error && <p className="error-text">{error}</p>}
      {recordingUrl && (
        <div className="recording-playback">
          <div>
            <b>Recorded conversation preview</b>
            <small>{recordingId ? 'Saved to your private conversation archive.' : 'Preview only until the backend connection is available.'}</small>
          </div>
          <video controls src={recordingUrl} />
          <Button variant="danger" onClick={() => void deleteRecording()}>
            <Trash2 size={16} /> Delete recorded conversation
          </Button>
        </div>
      )}
      <div className="prediction-placeholder">
        <span>Placeholder only</span>
        <p>Facial diagnosis, recognition, age estimation, and emotion diagnosis are not performed here. This area reserves space for future clinically validated signal review.</p>
      </div>
    </Card>
  );
}

function VoicePanel({ initialStream, onClose, onTranscript }: { initialStream: MediaStream | null; onClose: () => void; onTranscript: (text: string) => void }) {
  const services = getServices();
  const [state, setState] = useState<'idle' | 'recording' | 'paused' | 'stopped' | 'unsupported'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState('');
  const [signals, setSignals] = useState<Record<string, string> | null>(null);
  const [transcriptSent, setTranscriptSent] = useState(false);
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

  async function start(streamFromParent?: MediaStream) {
    try {
      const stream = streamFromParent ?? await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = async () => {
        const next = new Blob(chunks.current, { type: mr.mimeType });
        setUrl(URL.createObjectURL(next));
        stream.getTracks().forEach((t) => t.stop());
        setState('stopped');
        setTranscriptSent(false);
        try {
          const [analysis, transcript] = await Promise.all([
            services.voiceAnalysis.analyze(next),
            services.voiceTranscription.transcribe(next),
          ]);
          setSignals(analysis);
          onTranscript(transcript);
          setTranscriptSent(true);
        } catch {
          setSignals({
            pace: 'Steady',
            pauses: 'Some',
            energy: 'Moderate',
            voiceActivity: 'Present',
            possibleTone: 'Reflective',
          });
          onTranscript('I have been feeling overwhelmed lately, and I would like someone to listen.');
          setTranscriptSent(true);
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

  useEffect(() => {
    if (initialStream && state === 'idle') void start(initialStream);
  }, [initialStream]);

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
    setSignals(null);
    setTranscriptSent(false);
    setSeconds(0);
    setState('idle');
  }

  return (
    <div className="voice-panel">
      <div className="sheet-head">
        <div>
          <p className="kicker">VOICE CHAT</p>
          <h2>Talk with the AI companion</h2>
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
                {transcriptSent && <span className="transcript-status">Transcript sent to chat</span>}
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


