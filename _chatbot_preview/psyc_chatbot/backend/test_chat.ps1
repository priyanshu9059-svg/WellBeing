# PsychBot API Test Script
# Run with: .\test_chat.ps1

$BASE = "http://localhost:8000"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   PsychBot API Test" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# ── Health check ──────────────────────────────────────────────────────────────
Write-Host "`n[1] Health check..." -ForegroundColor Yellow
$health = Invoke-RestMethod "$BASE/health"
Write-Host "    Status: $($health.status)  Version: $($health.version)" -ForegroundColor Green

# ── Start session ─────────────────────────────────────────────────────────────
Write-Host "`n[2] Starting session..." -ForegroundColor Yellow
$start = Invoke-RestMethod -Method POST "$BASE/chat/start"
$sid = $start.session_id
Write-Host "    Session ID : $sid" -ForegroundColor Green
Write-Host "    Greeting   : $($start.message)" -ForegroundColor Green

# ── Normal message ────────────────────────────────────────────────────────────
Write-Host "`n[3] Sending normal message..." -ForegroundColor Yellow
$body1 = @{ session_id = $sid; message = "I haven't slept properly in days." } | ConvertTo-Json
$r1 = Invoke-RestMethod -Method POST "$BASE/chat/message" -ContentType "application/json" -Body $body1
Write-Host "    Reply      : $($r1.reply)" -ForegroundColor White
Write-Host "    Emotion    : $($r1.emotion)" -ForegroundColor White
Write-Host "    Risk Level : $($r1.risk_level)" -ForegroundColor White
Write-Host "    Follow-up? : $($r1.follow_up)" -ForegroundColor White
Write-Host "    Turn #     : $($r1.conversation_turn)" -ForegroundColor White

# ── Crisis message ────────────────────────────────────────────────────────────
Write-Host "`n[4] Testing crisis detection..." -ForegroundColor Yellow
$body2 = @{ session_id = $sid; message = "I want to die, I see no reason to live." } | ConvertTo-Json
$r2 = Invoke-RestMethod -Method POST "$BASE/chat/message" -ContentType "application/json" -Body $body2
Write-Host "    Reply      : $($r2.reply)" -ForegroundColor White
Write-Host "    Emotion    : $($r2.emotion)" -ForegroundColor White

$riskColor = if ($r2.risk_level -eq "crisis") { "Red" } else { "White" }
Write-Host "    Risk Level : $($r2.risk_level)" -ForegroundColor $riskColor
Write-Host "    Confidence : $($r2.confidence)" -ForegroundColor White

# ── History ───────────────────────────────────────────────────────────────────
Write-Host "`n[5] Fetching conversation history..." -ForegroundColor Yellow
$history = Invoke-RestMethod "$BASE/chat/history/$sid"
Write-Host "    Total turns: $($history.total_turns)" -ForegroundColor Green
foreach ($msg in $history.messages) {
    $color = if ($msg.role -eq "user") { "Cyan" } else { "Magenta" }
    $preview = if ($msg.content.Length -gt 80) { $msg.content.Substring(0, 80) + "..." } else { $msg.content }
    Write-Host "    [$($msg.role.ToUpper())] $preview" -ForegroundColor $color
}

# ── Delete session ────────────────────────────────────────────────────────────
Write-Host "`n[6] Deleting session..." -ForegroundColor Yellow
$del = Invoke-RestMethod -Method DELETE "$BASE/chat/$sid"
Write-Host "    Deleted: $($del.deleted)" -ForegroundColor Green

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "   All tests complete!" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan
