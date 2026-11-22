# LOCAL ONLY: voices larrakia.local.js words (lk_*) into voice\lk_*.mp3 (gitignored). Not published until Larrakia Nation consents.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User')
$src = [IO.File]::ReadAllText((Join-Path $root 'larrakia.local.js'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($src, "(\w+):\s*\{ w: '[^']+',\s*say: '([^']+)'")) {
  $file = Join-Path $root "voice\lk_$($m.Groups[1].Value).mp3"; if (Test-Path $file) { continue }
  $body = @{ text = "$($m.Groups[2].Value)."; model_id = 'eleven_multilingual_v2'; voice_settings = @{ stability = 0.7; similarity_boost = 0.8; style = 0.1; speed = 0.85 } } | ConvertTo-Json -Depth 3
  Invoke-WebRequest -Uri 'https://api.elevenlabs.io/v1/text-to-speech/NihRgaLj2HWAjvZ5XNxl?output_format=mp3_44100_128' -Method Post -Headers @{ 'xi-api-key' = $key } -ContentType 'application/json' -Body $body -OutFile $file
  "made lk_$($m.Groups[1].Value)"
}
