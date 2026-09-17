# Feature status

## Available (frontend + backend when API is configured)

- Responsive landing and optional onboarding
- Support chat with persistence (API or local fallback), prompts, feedback, voice panel
- Mood check-in with charts driven by user entries, export, sync
- Private journal CRUD with search/filter/pin and sync
- Nine guided exercise players
- Wellbeing snapshot from answers (server heuristic / optional AI chat)
- Safety plan editor with sync, print, export
- Consultancy directory + appointment booking against DB places
- Professional portal with real auth, dashboard, queries, availability
- Organization codes and aggregate privacy threshold
- Privacy Center reflecting live consent
- Settings prefs (anonymous / reduced sensory) persisted locally
- PWA manifest and offline fallback
- Notifications logged server-side; counsellor handoff requests stored
- Analytics events and emergency connect intent (no auto-dispatch)

## Optional / environment-dependent

- OpenAI chat replies when `OPENAI_API_KEY` is set
- Production SMS/email when `NOTIFICATION_MODE` is wired to a provider

## Requires clinical validation before enabling

Diagnostic assessments, automatic clinical risk scores, PHQ-9/GAD-7, treatment advice, emotion diagnosis, escalation thresholds (`clinicalScreeners` remains false).

## Still future

Live anonymous telephony, verified third-party clinic APIs, full translated content, production emergency system integration beyond `tel:` links.
