# Packt die App als unsignierte .wgt-Datei (ZIP) nach dist\SOVideoPlayer.wgt.
# Die Signierung uebernimmt z.B. Apps2Samsung beim Installieren.
# Aufruf:  powershell -ExecutionPolicy Bypass -File build-wgt.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$out  = Join-Path $dist 'SOVideoPlayer.wgt'

# Nur diese Dateien/Ordner kommen ins Paket (kein .dev, keine Projektdateien).
$include = @('config.xml', 'index.html', 'icon.png', 'css', 'js')

New-Item -ItemType Directory -Force $dist | Out-Null
if (Test-Path $out) { Remove-Item $out -Force }

Push-Location $root
try {
    # tar.exe (in Windows 10/11 enthalten) erzeugt ZIPs mit korrekten "/"-Pfaden,
    # anders als Compress-Archive unter Windows PowerShell 5.
    # Explizit das Windows-tar (bsdtar) verwenden: GNU-tar aus Git for Windows kann kein ZIP.
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (-not (Test-Path $tar)) { throw "Windows-tar nicht gefunden: $tar (ab Windows 10 1803 enthalten)" }
    & $tar --format zip -cf $out @include
    if ($LASTEXITCODE -ne 0) { throw "tar fehlgeschlagen ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host "Erstellt: $out"
