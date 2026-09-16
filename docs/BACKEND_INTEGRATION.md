# Backend integration map

The Express API in `backend/` implements the contracts in `services/index.ts`. The frontend uses `getServices()` which selects `apiServices` when `NEXT_PUBLIC_API_BASE_URL` is set, otherwise local mocks.

| Interface | Implementation |
|---|---|
| `ChatService` | `POST /api/chat/send` — heuristic or OpenAI |
| `VoiceTranscriptionService` | `POST /api/wellbeing/voice/transcribe` |
| `VoiceAnalysisService` | `POST /api/wellbeing/voice/analyze` |
| `RiskScreeningService` | `POST /api/wellbeing/risk-screen` |
| `WellbeingAnalysisService` | `POST /api/wellbeing/analyze` |
| `AuthenticationService` | `/api/auth/*` JWT sessions |
| `UserProfileService` | `/api/profile/consent` |
| `JournalService` / `MoodService` | `/api/journal`, `/api/mood` |
| `SafetyPlanService` | `/api/safety-plan` |
| `NotificationService` | `/api/notifications/send` (log mode by default) |
| `CounsellorService` | `/api/counsellor/request` |
| `EmergencyService` | `/api/emergency/connect` + resource links |
| `OrganizationService` | `/api/organizations/*` |
| `AnalyticsService` | `/api/analytics/track` |
| Care / Professional | `/api/care/*`, `/api/professional/*` |

## Integration rules

1. Keep API keys server-side (`backend/.env`).
2. Preserve independent contact and wellbeing-summary consent.
3. Version privacy policy, consent language, and retention rules for production.
4. Re-verify regional crisis resources before release.
5. JWT auth is required for identifiable persistence.
6. Abort signals are supported on client fetches.
7. Complete clinical/safety/privacy review before enabling high-risk flags.
