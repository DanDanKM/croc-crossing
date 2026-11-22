# Makes the backing tracks with ElevenLabs Music into music\ (original instrumentals, warm Top End saltwater-country feel).
# Only missing tracks are made; use -Force to remake. Key: ELEVENLABS_API_KEY user variable.
param([switch]$Force, [int]$Seconds = 60)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = $env:ELEVENLABS_API_KEY; if (-not $key) { $key = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User') }
$dir = Join-Path $root 'music'; New-Item -ItemType Directory -Force $dir | Out-Null
$tail = 'Instrumental only, no vocals. Seamless loop for a children''s game, steady tempo, ends where it began.'
$tracks = [ordered]@{
  map    = 'Gentle acoustic folk, warm fingerpicked steel-string guitar, soft hand percussion and light bass. Northern Australian saltwater-country feel: relaxed, hopeful, sunlit and welcoming.'
  game   = 'Upbeat island reggae-rock, bright acoustic guitar off-beat strum, warm round bass, light drum kit and shaker. Sunny tropical coastal Australian feel, happy and bouncy.'
  slide  = 'Laid-back acoustic country-folk with gentle slide guitar, brushed drums and upright bass. Wide open outback, red rocks and sunset, warm and easy.'
  island = 'Joyful island string-band: ukulele, acoustic guitar, hand drums and log drum, call-and-response guitar riffs. Bright Torres Strait island beach feel.'
  gamelan = 'Bright tropical groove mixing soft gamelan metallophones and gongs with acoustic guitar and light percussion. Calm, playful, island village morning.'
  night  = 'Calm night-time acoustic: soft fingerpicked guitar, gentle bass, faint shaker like water lapping a boat. Dreamy, cosy, starry night on the harbour.'
}
foreach ($k in $tracks.Keys) {
  $file = Join-Path $dir "$k.mp3"
  if ((Test-Path $file) -and -not $Force) { "kept $k"; continue }
  $body = @{ prompt = "$($tracks[$k]) $tail"; music_length_ms = $Seconds * 1000; force_instrumental = $true } | ConvertTo-Json
  try {
    Invoke-WebRequest -Uri 'https://api.elevenlabs.io/v1/music' -Method Post -Headers @{ 'xi-api-key' = $key } -ContentType 'application/json' -Body $body -OutFile $file -TimeoutSec 300
    "made $k $([math]::Round((Get-Item $file).Length / 1KB)) KB"
  } catch { "FAILED $k : $($_.ErrorDetails.Message)" }
}
