# Serves the game at http://localhost:8766/ for testing on this PC.
param([int]$Port = 8766)
$root = Split-Path $PSScriptRoot -Parent
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json'; '.mp3'='audio/mpeg'; '.png'='image/png'; '.svg'='image/svg+xml'; '.webmanifest'='application/manifest+json' }
$l = New-Object Net.HttpListener; $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
Write-Host "Croc Crossing on http://localhost:$Port/"
while ($l.IsListening) {
  $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if (-not $p) { $p = 'index.html' }
  if ($c.Request.HttpMethod -eq 'POST' -and $p -match '^save/([\w\-]+\.png)$') { # icon.html saves rendered icons into icons\
    $dir = Join-Path $root 'icons'; New-Item -ItemType Directory -Force $dir | Out-Null
    $fs = [IO.File]::Create((Join-Path $dir $Matches[1])); $c.Request.InputStream.CopyTo($fs); $fs.Close()
    $c.Response.StatusCode = 201; $c.Response.Close(); continue
  }
  if ($p.EndsWith('/')) { $p += 'index.html' }
  $f = Join-Path $root $p
  if ((Test-Path $f -PathType Leaf) -and ([IO.Path]::GetFullPath($f).StartsWith($root))) {
    $b = [IO.File]::ReadAllBytes($f); $c.Response.ContentType = $types[[IO.Path]::GetExtension($f)]; $c.Response.Headers.Add('Cache-Control','no-store')
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
