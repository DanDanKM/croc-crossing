# Makes voice-samples\ (not published: in .gitignore) to compare narrator and Indonesian voices.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User')
$dir = Join-Path $root 'voice-samples'; New-Item -ItemType Directory -Force $dir | Out-Null
$en = "G'day Felix! What letter does crocodile start with? ... C! C is for crocodile. Now, let's spell crab. C, R, A, B. That spells crab! Well done, mate."
$idText = "Halo! Terima kasih. Satu, dua, tiga, empat, lima. Buaya."
$narr = @(
  @('Charlie (current) - AU male, energetic','IKne3meq5aSn9XLyUdCD'),
  @('Matilda - AU woman, storyteller','NihRgaLj2HWAjvZ5XNxl'),
  @('Emma - AU woman, warm','56bWURjYFHyYyVf490Dp'),
  @('Jess - AU woman, friendly','ys3XeJJA4ArWMhRpcX1D'),
  @('Amelia - young AU woman, narrator','nBoLwpO4PAjQaQwVKPI1'),
  @('Samuel - AU man, calm storyteller','FrejFnPpRNrX6s6raOSX'),
  @('Josh - AU man, educational','pg7Nd5b8Y3tnfSndq5lh'),
  @('Dan Survey Man (your voice library)','jfyCP3z6QaiXOzu7bmKf'),
  @('Old Man Dan (your voice library)','jeYbX0EANiK84Oi2DbSb')
)
$indo = @(
  @('Gavrila - Indonesian, encouraging storyteller','gjhfBUoH6DHh0DG1X4u0'),
  @('Maya - Indonesian, warm and soft','U3dExJoUNcmTY5H6GMuG'),
  @('Arunika - Indonesian, very clear','o5s6XRBkPSTD4syv6mZg'),
  @('Charlie speaking Indonesian','IKne3meq5aSn9XLyUdCD')
)
function Gen($vid, $text, $file, $model, $lang) {
  $b = @{ text = $text; model_id = $model; voice_settings = @{ stability = 0.55; similarity_boost = 0.8; style = 0.2; speed = 0.9; use_speaker_boost = $true } }
  if ($lang) { $b.language_code = $lang }
  Invoke-WebRequest -Uri "https://api.elevenlabs.io/v1/text-to-speech/$vid`?output_format=mp3_44100_128" -Method Post -Headers @{ 'xi-api-key' = $key } `
    -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($b | ConvertTo-Json -Depth 4))) -OutFile (Join-Path $dir $file) -UseBasicParsing
}
$rows = @()
$i = 0; foreach ($v in $narr) { $i++; $f = "en$i.mp3"; Gen $v[1] $en $f 'eleven_multilingual_v2' $null; $rows += "<div class=r><b>$($v[0])</b><audio controls src='$f'></audio><code>$($v[1])</code></div>" }
$rows += '<h2>Indonesian words</h2>'
$i = 0; foreach ($v in $indo) { $i++; $f = "id$i.mp3"; Gen $v[1] $idText $f 'eleven_turbo_v2_5' 'id'; $rows += "<div class=r><b>$($v[0])</b><audio controls src='$f'></audio><code>$($v[1])</code></div>" }
$html = "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Voice samples</title><style>body{font-family:system-ui;max-width:720px;margin:20px auto;padding:0 16px;background:#fff8ec}.r{background:#fff;border-radius:12px;padding:10px;margin:8px 0}b{display:block}audio{width:100%}code{font-size:11px;color:#888}</style><h1>Croc Crossing voice samples</h1><p>Same teaching lines in each voice, at the slower, steadier settings now used.</p><h2>Narrator</h2>" + ($rows -join "`n")
[IO.File]::WriteAllText((Join-Path $dir 'index.html'), $html, (New-Object Text.UTF8Encoding $false))
"Samples: $($narr.Count) narrators, $($indo.Count) Indonesian -> $dir"
