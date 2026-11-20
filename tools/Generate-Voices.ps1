# Generates ElevenLabs mp3s for every line in data.js into voice\, then writes voice\index.json.
# Usage:  $env:ELEVENLABS_API_KEY = '<your key>';  .\tools\Generate-Voices.ps1
# Optional: -VoiceId <id> (default: Rachel, a warm friendly voice), -Force to redo existing clips.
param(
  [string]$VoiceId = '21m00Tcm4TlvDq8ikWAM',
  [string]$CrocVoiceId = '',
  [string]$Model = 'eleven_multilingual_v2',
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = $env:ELEVENLABS_API_KEY
if (-not $key) { $key = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User') }  # set with setx
if (-not $key) { throw 'Set $env:ELEVENLABS_API_KEY first (ElevenLabs > Profile > API keys).' }

$raw = [IO.File]::ReadAllText((Join-Path $root 'data.js'), [Text.Encoding]::UTF8)
$json = $raw.Substring($raw.IndexOf('{'), $raw.LastIndexOf('}') - $raw.IndexOf('{') + 1)
$lines = ($json | ConvertFrom-Json).lines
$dir = Join-Path $root 'voice'
New-Item -ItemType Directory -Force $dir | Out-Null

$crocKeys = @('chomp','croceat','crocroad')
$made = 0; $skipped = 0
foreach ($p in $lines.PSObject.Properties) {
  $file = Join-Path $dir "$($p.Name).mp3"
  if ((Test-Path $file) -and -not $Force) { $skipped++; continue }
  $vid = if ($CrocVoiceId -and $crocKeys -contains $p.Name) { $CrocVoiceId } else { $VoiceId }
  $body = @{ text = $p.Value; model_id = $Model
             voice_settings = @{ stability = 0.45; similarity_boost = 0.8; style = 0.35; use_speaker_boost = $true } } | ConvertTo-Json -Depth 4
  $uri = "https://api.elevenlabs.io/v1/text-to-speech/$vid`?output_format=mp3_44100_64"
  try {
    Invoke-WebRequest -Uri $uri -Method Post -Headers @{ 'xi-api-key' = $key; 'Accept' = 'audio/mpeg' } `
      -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -OutFile $file -UseBasicParsing
    $made++; Write-Host "ok  $($p.Name)"
  } catch {
    Write-Warning "failed $($p.Name): $($_.Exception.Message)"
    if (Test-Path $file) { Remove-Item $file }
    if ($_.Exception.Message -match '401|quota') { break }
  }
}
$have = Get-ChildItem $dir -Filter *.mp3 | ForEach-Object { $_.BaseName } | Sort-Object
[IO.File]::WriteAllText((Join-Path $dir 'index.json'), ($have | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
"Made $made, kept $skipped existing, $($have.Count) clips listed in voice\index.json"
