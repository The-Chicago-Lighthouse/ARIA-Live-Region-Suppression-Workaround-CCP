# deploy-tampermonkey-script.ps1
# Copies the userscript into Tampermonkey's script storage for Chrome and Edge

$sourceScript = "\\YourDomain\SYSVOL\YourDomain\scripts\suppress-aria-ccp.user.js"
$scriptContent = Get-Content $sourceScript -Raw

# --- Chrome Tampermonkey path ---
$chromeTMBase = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Tampermonkey"

# --- Edge Tampermonkey path ---
$edgeTMBase = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Tampermonkey"

function Deploy-Script($tmBase) {
    if (-not (Test-Path $tmBase)) {
        Write-Host "Tampermonkey not found at $tmBase — skipping"
        return
    }

    $scriptDir = "$tmBase\scripts"
    New-Item -ItemType Directory -Force -Path $scriptDir | Out-Null
    $destFile = "$scriptDir\suppress-aria-ccp.user.js"
    $scriptContent | Out-File -FilePath $destFile -Encoding UTF8 -Force
    Write-Host "✅ Script deployed to $destFile"
}

Deploy-Script $chromeTMBase
Deploy-Script $edgeTMBase