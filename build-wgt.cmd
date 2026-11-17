@echo off
rem Baut dist\SOVideoPlayer.wgt (umgeht die PowerShell-Ausfuehrungsrichtlinie nur fuer diesen Aufruf)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-wgt.ps1"
if "%~1"=="" pause
