# Feature status

## Available in this frontend prototype

- Original responsive landing and optional three-step onboarding
- Anonymous mocked support chat, suggested prompts, feedback, stop response, history/resource drawers, and local persistence
- Browser `MediaRecorder` flow with start, pause, resume, stop, playback, retry, deletion, timer, waveform, and graceful fallback
- Non-diagnostic prototype voice presentation signals
- Optional camera consent, preview, activity visual, skip, explicit stop, and cleanup on exit
- Simulated wellbeing analysis and non-diagnostic snapshot
- Mood check-in, weekly/monthly Recharts, calendar, summaries, JSON export, and local persistence
- Private journal create, search, filter, edit, pin, delete, prompts, local autosave, and persistence
- Nine guided exercise players with pause, restart, exit, timer, completion, and reflection
- Editable, reorderable, printable, exportable local safety plan
- Persistent urgent-help access and centralized India prototype resources
- Local keyword safeguard with transparent validation warning
- Anonymous/contact choice with independent contact and summary consents
- Anonymous organization-code flow and minimum-group aggregate privacy state
- Privacy Center, selective clearing, full-session clearing, permission status, and JSON export
- English, Hindi, and Hinglish selector UI
- PWA manifest, icon placeholder, registration, install instructions, and offline fallback
- Keyboard focus states, semantic controls, reduced-motion support, and mobile-safe navigation

## Requires backend integration

Real AI, real speech-to-text, accounts, cross-device persistence, database storage, SMS, email, counsellor handoff, anonymous telephony, organization administration, and real analytics.

## Requires clinical validation or approval

Diagnostic assessments, automatic risk scores, clinical questionnaires/scoring, treatment advice, emotion interpretation, and escalation thresholds.

## Deliberately disabled by default

Clinical screeners, counsellor handoff, anonymous calls, SMS, and emergency integration. See `config/features.ts`.
