# Builds data.js (letters, pictures, words and every spoken line) for Croc Crossing.
# Single source of truth: the game reads data.js, Generate-Voices.ps1 reads the same lines.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$pics = [ordered]@{
  A=@('apple','🍎'); B=@('ball','⚽'); C=@('cat','🐱'); D=@('dog','🐶'); E=@('egg','🥚')
  F=@('fish','🐟'); G=@('goat','🐐'); H=@('hat','🎩'); I=@('insect','🐞'); J=@('juice','🧃')
  K=@('kite','🪁'); L=@('lion','🦁'); M=@('moon','🌙'); N=@('nose','👃'); O=@('octopus','🐙')
  P=@('pig','🐷'); Q=@('queen','👑'); R=@('rabbit','🐰'); S=@('sun','☀️'); T=@('tree','🌳')
  U=@('umbrella','☂️'); V=@('van','🚐'); W=@('whale','🐳'); X=@('fox','🦊'); Y=@('yo-yo','🪀'); Z=@('zebra','🦓')
}

$words = [ordered]@{
  '3' = @( @('CAT','🐱'),@('DOG','🐶'),@('SUN','☀️'),@('BUS','🚌'),@('HAT','🎩'),@('PIG','🐷'),
           @('CUP','☕'),@('BED','🛏️'),@('FOX','🦊'),@('VAN','🚐'),@('BOX','📦'),@('NET','🥅'),
           @('JAM','🍯'),@('MUM','👩'),@('DAD','👨'),@('BEE','🐝'),@('EGG','🥚'),@('OWL','🦉') )
  '4' = @( @('CROC','🐊'),@('BOAT','⛵'),@('FISH','🐟'),@('SHIP','🚢'),@('FROG','🐸'),@('DUCK','🦆'),
           @('CAKE','🎂'),@('TREE','🌳'),@('STAR','⭐'),@('SAND','🏖️'),@('SWIM','🏊'),@('DORY','🛶'),
           @('CRAB','🦀'),@('MOON','🌙'),@('KITE','🪁'),@('BIKE','🚲') )
  '5' = @( @('TRUCK','🚚'),@('OCEAN','🌊'),@('WHALE','🐳'),@('TIGER','🐯'),@('BEACH','🏖️'),@('TRAIN','🚆'),
           @('SHARK','🦈'),@('HORSE','🐴'),@('PIZZA','🍕'),@('ANCHOR','⚓'),@('ROCKET','🚀'),@('PLANET','🪐'),
           @('FERRY','⛴️'),@('TURTLE','🐢'),@('DARWIN','🐊'),@('SURVEY','📋') )
}

$players = @('Felix','Remi')
$lines = [ordered]@{}

foreach ($L in $pics.Keys) {
  $p = $pics[$L][0]
  $lines["letter_$L"] = "$L."
  $lines["find_$L"]   = "Find the letter $L!"
  if ($L -eq 'X') {
    $lines["sound_$L"] = "Which letter is at the end of fox?"
    $lines["is_$L"]    = "X! Fox ends with X!"
  } else {
    $lines["sound_$L"] = "What letter does $p start with?"
    $lines["is_$L"]    = "$L! $L is for $p!"
  }
  $lines["house_$L"]  = "Drive to the house with the letter $L!"
}

foreach ($len in $words.Keys) {
  foreach ($w in $words[$len]) {
    $word = $w[0]; $say = $word.ToLower()
    $spelled = ($word.ToCharArray() | ForEach-Object { "$_" }) -join ', '
    $lines["spell_$word"] = "Let's spell $say!"
    $lines["done_$word"]  = "$spelled. That spells $say! Well done!"
  }
}

foreach ($n in $players) {
  $k = $n.ToLower()
  $lines["hi_$k"]    = "Hi $n! Let's cross the croc river!"
  $lines["great_$k"] = "Great job $n!"
  $lines["super_$k"] = "$n, you're a superstar!"
}

$phr = [ordered]@{
  wrong1    = "Oops! That's not the one. Try again!"
  wrong2    = "Nearly! Have another go!"
  thats     = "That's"
  chomp     = "Chomp! Watch out for the croc's big mouth!"
  splash    = "Splash! Hop onto a boat or a log."
  bonk      = "Beep beep! Watch out for the cars."
  croceat   = "Chomp chomp! The croc ate a car!"
  level     = "Level complete!"
  bonus     = "Bonus mission! Jump in the car!"
  bonusword = "Drive to each house, in order, to spell the word."
  delivered = "Delivered! Ding ding!"
  bonusdone = "Mission complete! You're a top driver!"
  timeup    = "Time's up! Good try. Let's keep going."
  crocroad  = "Yikes! A croc on the road!"
  ready     = "Ready? Hop hop hop!"
  ontop     = "Hop on the croc's back when his mouth is shut!"
}
foreach ($k in $phr.Keys) { $lines[$k] = $phr[$k] }

$data = [ordered]@{ pics = $pics; words = $words; lines = $lines }
$json = $data | ConvertTo-Json -Depth 6 -Compress
$out = Join-Path $root 'data.js'
[IO.File]::WriteAllText($out, "window.CROC = $json;`n", (New-Object Text.UTF8Encoding $false))
"Wrote $out with $($lines.Count) lines, $(($lines.Values | Measure-Object -Property Length -Sum).Sum) characters"
