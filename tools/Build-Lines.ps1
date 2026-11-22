# Builds lines.js (every spoken line, keyed) from content.js. Generate-Voices.ps1 voices these keys.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$raw = [IO.File]::ReadAllText((Join-Path $root 'content.js'), [Text.Encoding]::UTF8)
$C = $raw.Substring($raw.IndexOf('{'), $raw.LastIndexOf('}') - $raw.IndexOf('{') + 1) | ConvertFrom-Json
$L = [ordered]@{}
function Add($k, $t) { if (-not $script:L.Contains($k)) { $script:L[$k] = $t } }
function W($w) { Add ('w_' + $w.ToLower()) $w }
$numWords = $C.numbers

foreach ($p in $C.phrases.PSObject.Properties) { Add $p.Name $p.Value }
foreach ($ch in [char[]]'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { Add "l_$ch" "$ch."; Add "th_$ch" "That's $ch." }
# Indonesian words (voiced with the Indonesian language setting): idw_<slug>
function Slug($s) { ($s -replace '[\s\-]', '_').ToLower() }
$Indo = $C.indo
foreach ($gr in $Indo.greet) { Add "idw_$(Slug $gr[0])" "$($gr[0])."; Add "wm_$(Slug $gr[0])" "It means $($gr[1])." }
foreach ($n in $Indo.numbers) { Add "idw_$(Slug $n)" "$n." }
foreach ($p in $Indo.colours.PSObject.Properties) { Add "idw_$(Slug $p.Value)" "$($p.Value)." }
foreach ($p in $Indo.animals.PSObject.Properties) { Add "idw_$(Slug $p.Value)" "$($p.Value)." }
foreach ($p in $Indo.facts.PSObject.Properties) { Add "idf_$($p.Name)" $p.Value }
foreach ($col in $C.colours) { Add "rc_$($col[0])" "Find $($col[0])!"; W $col[0] }
for ($n = 1; $n -le 5; $n++) { Add "rn_$n" "Find $($numWords[$n])!"; Add "n_$n" "$($numWords[$n])!" }
foreach ($h in $C.homes.PSObject.Properties) { Add "home_$($h.Name)" $h.Value }

foreach ($s in $C.stops) {
  Add "st_$($s.id)" $s.intro
  if ($s.country -ne 'Australia') { Add "geo_$($s.id)" "Which flag belongs to $($s.country)?" }
  foreach ($a in $s.animals) {
    Add "fact_$($a.id)" $a.fact
    Add "clue_$($a.id)" $a.clue
    Add "rf_$($a.id)" "Can you find the $($a.word)?"
    Add "fl_$($a.id)" "What letter does $($a.word) start with?"
    Add "dsc_$($a.id)" "The $($a.word) is... which word describes it?"
    if ($a.sound) { Add "snd_$($a.id)" "Who goes $($a.sound)?" }
    Add "nm_$($a.id)" "$($a.name)!"
    if ($Indo.animals.($a.id)) { Add "idc_$($a.id)" "In Indonesian, the $($a.word) is called..." }
    W $a.word; W $a.adj
  }
  foreach ($w in $s.spell) {
    $say = $w.ToLower(); Add "spell_$w" "Let's spell $say!"
    Add "done_$w" ((($w.ToCharArray() | ForEach-Object { "$_" }) -join ', ') + ". That spells $say! Well done!")
  }
  $i = 0
  foreach ($sen in $s.sentences) { Add "sen_$($s.id)_$i" ((($sen -join ' ')) + '.'); foreach ($w in $sen) { W $w }; $i++ }
}
foreach ($w in $C.surfWords) {
  $say = $w.ToLower(); Add "spell_$w" "Let's spell $say!"
  Add "done_$w" ((($w.ToCharArray() | ForEach-Object { "$_" }) -join ', ') + ". That spells $say! Well done!")
}
foreach ($w in $C.sight) { W $w; Add "sw_$($w.ToLower())" "Find the word... $w." }
foreach ($r in $C.rhymes) { W $r.w; Add "rh_$($r.w)" "Which word rhymes with $($r.w)?"; foreach ($x in $r.r) { W $x[0] } }
foreach ($s in $C.syllables) { W $s[0]; Add "cl_$($s[0])" "How many claps in $($s[0])?" }
foreach ($p in $C.plurals) { W $p[0]; W $p[1]; Add "pl_$($p[0])" "One $($p[0]), two... what?" }
foreach ($w in $C.notAdj) { W $w }
foreach ($f in $C.flags) { W $f[0] }
foreach ($f in $C.fish) { W $f.name }
# v3: seasons, daily surprises, photo safari, sports, judo verbs, counting to ten, clap-along words
foreach ($s in $C.seasons) { Add "ss_$($s.id)" $s.fact; $i = 0; foreach ($p in $s.surprise) { Add "sp_$($s.id)_$i" "$($p[1])! $($p[2])"; $i++ } }
foreach ($s in $C.stops) { foreach ($a in $s.animals) { if ($a.home -ne 'plant') { Add "sn_$($a.id)" "Snap the $($a.word)!" } } }
for ($n = 0; $n -lt 10; $n++) { Add "n_$($n + 1)" "$($C.count10.en[$n])!"; Add "idw_$(Slug $C.count10.id[$n])" "$($C.count10.id[$n])." }
foreach ($v in $C.verbs) { W $v; Add "jv_$v" "Find the doing word... $v!" }
foreach ($p in $C.beats.PSObject.Properties) { W $p.Name }
foreach ($p in $C.shop) { Add "shop_$($p[0])" "A $($p[2])!" }

$json = $L | ConvertTo-Json -Compress
$out = Join-Path $root 'lines.js'
[IO.File]::WriteAllText($out, "window.LINES = $json;`n", (New-Object Text.UTF8Encoding $false))
"Wrote $out : $($L.Count) lines, $(($L.Values | Measure-Object -Property Length -Sum).Sum) characters"
