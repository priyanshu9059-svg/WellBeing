# Backend integration map

All external boundaries live in `services/index.ts`. Components currently use local mock implementations. `FutureApiServices` fails closed until an authenticated backend is configured.

| Interface | Current prototype | Future responsibility |
|---|---|---|
| `ChatService` | Short mocked supportive responses | Approved AI orchestration, moderation, audit controls |
| `VoiceTranscriptionService` | Prototype transcript | Secure audio upload and speech-to-text |
| `VoiceAnalysisService` | Non-clinical presentation card | Clinically reviewed signal processing, if approved |
| `RiskScreeningService` | Local phrase demonstration | Validated screening and reviewed escalation policy |
| `WellbeingAnalysisService` | Timed mock snapshot | Approved analysis pipeline and explainability |
| `AuthenticationService` | Disabled | Anonymous/account auth and session security |
| `UserProfileService` | Local consent state | Profile/consent versioning and revocation |
| `JournalService` / `MoodService` | `localStorage` | Encrypted transport, access controls, retention/deletion |
| `SafetyPlanService` | `localStorage`, print, JSON | Secure sync and explicit sharing controls |
| `NotificationService` | Disabled | Opt-in SMS/email provider integration |
| `CounsellorService` | Disabled | Staff availability, routing, consent, and audit trail |
| `EmergencyService` | Deliberate `tel:` links only | Regionally governed integration, if ever approved |
| `OrganizationService` | Demo codes and aggregates | Tenant boundaries, privacy thresholds, administration |
| `AnalyticsService` | No external tracking | Privacy-preserving, consent-aware aggregate analytics |

## Integration rules

1. Keep API keys and provider credentials server-side.
2. Preserve independent contact and wellbeing-summary consent.
3. Version privacy policy, consent language, and retention rules.
4. Officially verify every regional crisis resource before release.
5. Add authentication and authorization before any identifiable persistence.
6. Add request cancellation, loading states, retry policy, and user-safe errors at every boundary.
7. Complete clinical, safety, privacy, accessibility, and security review before enabling high-risk features.
