@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-docker.ps1" -Rebuild
