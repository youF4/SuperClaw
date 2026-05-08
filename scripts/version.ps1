param(
    [ValidateSet("major", "minor", "patch")]
    [string]$Part = "patch",
    [string]$Message = ""
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PackageJson = Join-Path $ProjectRoot "package.json"
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

# ---- UTF8 without BOM helper ----
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
function Write-Utf8NoBom($path, $content) {
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

# ---- 1. Update package.json ----
$pkg.version = $NewVer
Write-Utf8NoBom $PackageJson ($pkg | ConvertTo-Json -Depth 10)
Write-Host "[OK] package.json" -ForegroundColor Green

# ---- 2. Update CHANGELOG.md ----
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
    $lines = $cl -split "`n", 2
    $cl = $lines[0] + $NewSection + "`n" + $lines[1]
} else {
    $cl = "# Changelog$NewSection`n"
}
Write-Utf8NoBom $Changelog $cl
Write-Host "[OK] CHANGELOG.md" -ForegroundColor Green

# ---- 3. Git commit & tag ----
git add @(
    "package.json",
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
