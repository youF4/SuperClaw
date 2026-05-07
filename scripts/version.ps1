param(
    [ValidateSet("major", "minor", "patch")]
    [string]$Part = "patch",
    [string]$Message = ""
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PackageJson = Join-Path $ProjectRoot "package.json"
$CargoToml   = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
$TauriConf   = Join-Path $ProjectRoot "src-tauri\tauri.conf.json"
$Changelog   = Join-Path $ProjectRoot "CHANGELOG.md"

# ---- Read current version from package.json ----
$pkg = Get-Content $PackageJson -Raw | ConvertFrom-Json
$ver = [Version]($pkg.version)
$major, $minor, $patch = $ver.Major, $ver.Minor, $ver.Build

switch ($Part) {
    "major" { $major += 1; $minor = 0; $patch = 0 }
    "minor" { $minor += 1; $patch = 0 }
    "patch" { $patch += 1 }
}
$NewVer = "$major.$minor.$patch"
$Tag = "v$NewVer"

Write-Host "=== Bumping version: $($pkg.version) -> $NewVer ($Part) ===" -ForegroundColor Cyan

# ---- 1. Update package.json ----
$pkg.version = $NewVer
$pkg | ConvertTo-Json -Depth 10 | Set-Content $PackageJson -Encoding UTF8
Write-Host "[OK] package.json" -ForegroundColor Green

# ---- 2. Update Cargo.toml ----
$cargoLines = Get-Content $CargoToml
$inPackage = $false
for ($i = 0; $i -lt $cargoLines.Length; $i++) {
    if ($cargoLines[$i] -match '^\[package\]') { $inPackage = $true }
    elseif ($cargoLines[$i] -match '^\[.*\]') { $inPackage = $false }
    if ($inPackage -and $cargoLines[$i] -match '^version\s*=\s*"(\d+\.\d+\.\d+)"') {
        $cargoLines[$i] = 'version = "' + $NewVer + '"'
        break
    }
}
Set-Content $CargoToml $cargoLines -Encoding UTF8
Write-Host "[OK] Cargo.toml" -ForegroundColor Green

# ---- 3. Update tauri.conf.json ----
$tauri = Get-Content $TauriConf -Raw | ConvertFrom-Json
$tauri.version = $NewVer
$tauri | ConvertTo-Json -Depth 10 | Set-Content $TauriConf -Encoding UTF8
Write-Host "[OK] tauri.conf.json" -ForegroundColor Green

# ---- 4. Update CHANGELOG.md ----
$Date = Get-Date -Format "yyyy-MM-dd"
$Header = "## [$NewVer] - $Date"
$Entry = if ($Message) { "- $Message" } else { "- " }

$NewSection = @"

$Header

### $Part
$Entry
"@

if (Test-Path $Changelog) {
    $cl = Get-Content $Changelog -Raw
    # Insert after the first line (# Changelog)
    $lines = $cl -split "`n", 2
    $cl = $lines[0] + $NewSection + "`n" + $lines[1]
} else {
    $cl = "# Changelog$NewSection`n"
}
Set-Content $Changelog $cl -Encoding UTF8
Write-Host "[OK] CHANGELOG.md" -ForegroundColor Green

# ---- 5. Git commit & tag ----
git add @(
    "package.json",
    "src-tauri\Cargo.toml",
    "src-tauri\tauri.conf.json",
    "CHANGELOG.md"
)

$CommitMsg = if ($Message) { "chore: release $Tag - $Message" } else { "chore: release $Tag" }
git commit -m $CommitMsg
if ($?) {
    git tag $Tag
    Write-Host "[OK] git commit + tag $Tag created" -ForegroundColor Green
    Write-Host "`nTo push: git push && git push origin $Tag" -ForegroundColor Yellow
} else {
    Write-Host "[WARN] git commit failed (no changes?)" -ForegroundColor Yellow
}

Write-Host "`n=== Done: $NewVer ===" -ForegroundColor Cyan
