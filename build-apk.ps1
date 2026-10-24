# School ERP - Release APK Build Script (PowerShell)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     School ERP - Mobile APK Build Script (PowerShell)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Environment Variables setup
$env:JAVA_HOME = "D:\Android\gradle_user_home\jdks\eclipse_adoptium-17-amd64-windows.2"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = "D:\Android\sdk"
$env:GRADLE_USER_HOME = "D:\Android\gradle_user_home"
$env:TMP = "D:\Android\tmp"
$env:TEMP = "D:\Android\tmp"
Remove-Item env:_JAVA_OPTIONS -ErrorAction SilentlyContinue

Write-Host "`n[1/4] Environment configured:" -ForegroundColor Yellow
Write-Host "  JAVA_HOME: $env:JAVA_HOME"
Write-Host "  ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "  GRADLE_USER_HOME: $env:GRADLE_USER_HOME"

# 2. Clean native CXX caches
Write-Host "`n[2/4] Cleaning native build caches..." -ForegroundColor Yellow
Remove-Item -Path "D:\erp\mobile\android\app\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "D:\erp\mobile\node_modules\expo-modules-core\android\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  Caches cleared." -ForegroundColor Green

# 3. Build APK
Write-Host "`n[3/4] Building Release APK (approx 2-4 minutes)..." -ForegroundColor Yellow
Set-Location -Path "D:\erp\mobile\android"
cmd /c "gradlew.bat assembleRelease --gradle-user-home D:\Android\gradle_user_home"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Copy APK
Write-Host "`n[4/4] Copying APK to D:\erp\SchoolERP-Release.apk..." -ForegroundColor Green
$sourceApk = "D:\erp\mobile\android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $sourceApk) {
    Copy-Item -Path $sourceApk -Destination "D:\erp\SchoolERP-Release.apk" -Force
    Copy-Item -Path $sourceApk -Destination "D:\erp\mobile\SchoolERP-Release.apk" -Force
    $file = Get-Item "D:\erp\SchoolERP-Release.apk"
    Write-Host "`n===================================================" -ForegroundColor Green
    Write-Host "SUCCESS! APK Generated Successfully!" -ForegroundColor Green
    Write-Host "Location : $($file.FullName)" -ForegroundColor White
    Write-Host "Size     : $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor White
    Write-Host "Modified : $($file.LastWriteTime)" -ForegroundColor White
    Write-Host "===================================================" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Output APK not found!" -ForegroundColor Red
}
