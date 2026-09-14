# Wellbeing Support

An original, frontend-only mental wellbeing support prototype. It is designed around anonymous access, calm language, local device storage, and explicit limitations. It does not connect to external AI, a database, counsellors, emergency dispatch, SMS, email, police, or location services.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To verify a production build:

```bash
npm run build
```

## Routes

`/`, `/support`, `/chat`, `/mood`, `/journal`, `/exercises`, `/wellbeing`, `/safety-plan`, `/crisis`, `/privacy`, `/settings`, `/access-code`, `/organization-demo`, `/trust`, `/about`, and `/faq`.

## Architecture

- `app/`: route entry points and global styles
- `components/`: shared shell, crisis sheet, PWA registration, and UI primitives
- `features/`: chat, voice, mood, journal, exercises, wellbeing/camera, safety, privacy, and organization experiences
- `config/`: brand, crisis resources, privacy, feature flags, and integration boundaries
- `mocks/`: sample data and non-clinical prototype content
- `services/`: typed service contracts, mock implementations, abort handling, and future API placeholders
- `types/`: domain models
- `hooks/` and `lib/`: local persistence and utilities

Branding can be changed in `config/brand.ts`. Regional crisis information is in `config/crisis-resources.ts` and must be officially verified before production.

## Local persistence

The prototype uses `localStorage` with the `wellbeing-support:` prefix. Journal drafts autosave locally. Conversation, mood, journal, safety-plan, and consent state restore after refresh. The Privacy Center can export or selectively clear that data.

Local browser storage is not claimed to be encrypted. Do not use this prototype for sensitive production data.

## PWA

`public/manifest.webmanifest` and `public/sw.js` provide install metadata and a basic offline fallback. Installation depends on browser support. This is not a native Android or iOS application.

## Documentation

- [Feature status](docs/FEATURE_STATUS.md)
- [Backend integration map](docs/BACKEND_INTEGRATION.md)

## Safety and scope

The local keyword safeguard is a configurable demonstration only and requires professional validation. It never blocks resource access. Phone links run only after a deliberate click. The app never claims that a call was made, that help was dispatched, or that anyone is monitoring a participant.
