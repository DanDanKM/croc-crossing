# Voices every line in lines.js with ElevenLabs into voice\, then writes voice\index.json.
# Key: $env:ELEVENLABS_API_KEY or the User variable saved with setx.
# Only new or changed lines are generated (voice\manifest.json remembers text + voice); clips no longer used are deleted.
param(
  [string]$VoiceId = 'NihRgaLj2HWAjvZ5XNxl',      # Matilda - Australian storyteller (picked 22/11)
  [string]$CrocVoiceId = '2EiwWnXFnvU5JabPnv8n',  # Clyde - gravelly croc character
  [string]$IndoVoiceId = 'gjhfBUoH6DHh0DG1X4u0', # Gavrila - Indonesian words (idw_*)
  [string]$Model = 'eleven_multilingual_v2',
  [string]$IndoModel = 'eleven_turbo_v2_5',
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = $env:ELEVENLABS_API_KEY
if (-not $key) { $key = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User') }
if (-not $key) { throw 'Save your key first: setx ELEVENLABS_API_KEY "sk_..."' }

$raw = [IO.File]::ReadAllText((Join-Path $root 'lines.js'), [Text.Encoding]::UTF8)
$lines = $raw.Substring($raw.IndexOf('{'), $raw.LastIndexOf('}') - $raw.IndexOf('{') + 1) | ConvertFrom-Json
$dir = Join-Path $root 'voice'
New-Item -ItemType Directory -Force $dir | Out-Null
$manPath = Join-Path $dir 'manifest.json'
$man = @{}
if (Test-Path $manPath) { (Get-Content $manPath -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $man[$_.Name] = $_.Value } }

$crocKeys = @('chomp', 'croceat', 'f_croc', 'f_crocgot', 'c_crocroad', 'bd_snappy', 'b_croc')
$keys = @($lines.PSObject.Properties.Name)
$made = 0; $kept = 0; $failed = 0
foreach ($k in $keys) {
  $text = $lines.$k
  $indo = $k -like 'idw_*'
  $vid = if ($indo) { $IndoVoiceId } elseif ($crocKeys -contains $k) { $CrocVoiceId } else { $VoiceId }
  $mdl = if ($indo) { $IndoModel } else { $Model }
  $sig = "$vid|$mdl|v2|$text"
  $file = Join-Path $dir "$k.mp3"
  if (-not $Force -and (Test-Path $file) -and $man[$k] -eq $sig) { $kept++; continue }
  $stab = if ($k -like 'w_*' -or $k -like 'l_*' -or $indo) { 0.7 } else { 0.55 }
  $b = @{ text = $text; model_id = $mdl; voice_settings = @{ stability = $stab; similarity_boost = 0.8; style = 0.2; speed = 0.9; use_speaker_boost = $true } }
  if ($indo) { $b.language_code = 'id' }
  $body = $b | ConvertTo-Json -Depth 4
  try {
    Invoke-WebRequest -Uri "https://api.elevenlabs.io/v1/text-to-speech/$vid`?output_format=mp3_44100_128" -Method Post `
      -Headers @{ 'xi-api-key' = $key; 'Accept' = 'audio/mpeg' } -ContentType 'application/json; charset=utf-8' `
      -Body ([Text.Encoding]::UTF8.GetBytes($body)) -OutFile $file -UseBasicParsing
    $man[$k] = $sig; $made++
    if ($made % 50 -eq 0) { Write-Host "$made made..." }
  } catch {
    $failed++; Write-Warning "failed $k : $($_.Exception.Message)"
    if (Test-Path $file) { Remove-Item $file }
    if ($_.Exception.Message -match '401|quota|402') { break }
  }
}
# drop clips for lines that no longer exist
$keep = [Collections.Generic.HashSet[string]]::new([string[]]$keys, [StringComparer]::OrdinalIgnoreCase)
$removed = 0
Get-ChildItem $dir -Filter *.mp3 | Where-Object { -not $keep.Contains($_.BaseName) } | ForEach-Object { Remove-Item $_.FullName; $man.Remove($_.BaseName); $removed++ }
$have = Get-ChildItem $dir -Filter *.mp3 | ForEach-Object { $_.BaseName } | Sort-Object
$utf8 = New-Object Text.UTF8Encoding $false
[IO.File]::WriteAllText((Join-Path $dir 'index.json'), (ConvertTo-Json @($have) -Compress), $utf8)
[IO.File]::WriteAllText($manPath, ($man | ConvertTo-Json -Compress), $utf8)
"Made $made, kept $kept, failed $failed, removed $removed old; $($have.Count) clips listed"
