param(
    [switch]$SkipBundle
)

$ErrorActionPreference = "Stop"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         School ERP - Production APK Build Pipeline       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$mobileDir = "D:\erp\mobile"
$bundleFile = "$mobileDir\index.android.bundle"
$hbcFile = "$mobileDir\index.android.hbc"
$hermesc = "$mobileDir\node_modules\hermes-compiler\hermesc\win64-bin\hermesc.exe"
$backupApk = "D:\erp\SchoolERP-Backup.apk"
$unsignedApk = "D:\erp\SchoolERP-Unsigned.apk"
$alignedApk = "D:\erp\SchoolERP-Aligned.apk"
$finalApk = "D:\erp\SchoolERP-Release.apk"
$mobileFinalApk = "$mobileDir\SchoolERP-Release.apk"
$realWebpDir = "D:\erp\real_webp"
$zipalign = "D:\Android\sdk\build-tools\35.0.0\zipalign.exe"
$apksigner = "D:\Android\sdk\build-tools\35.0.0\apksigner.bat"
$keystore = "$mobileDir\android\app\debug.keystore"

$env:JAVA_HOME = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH

# STEP 1: JavaScript Bundle Export
if (-not $SkipBundle) {
    Write-Host "`n[1/5] Bundling React Native JavaScript..." -ForegroundColor Yellow
    Set-Location $mobileDir
    cmd /c "npx expo export:embed --platform android --dev false --entry-file index.js --bundle-output index.android.bundle --assets-dest android/app/src/main/res"
    if ($LASTEXITCODE -ne 0) {
        throw "Metro bundle export failed with exit code $LASTEXITCODE"
    }
    if (-not (Test-Path $bundleFile)) {
        throw "Bundle output not found at: $bundleFile"
    }
    $bSize = [math]::Round((Get-Item $bundleFile).Length / 1MB, 2)
    Write-Host "JS Bundle generated successfully ($($bSize) MB)" -ForegroundColor Green
} else {
    Write-Host "`n[1/5] Skipping JS bundling (using existing bundle)..." -ForegroundColor Yellow
}

# STEP 2: Hermes Bytecode Compilation
Write-Host "`n[2/5] Compiling to Hermes Bytecode (HBC)..." -ForegroundColor Yellow
if (Test-Path $hbcFile) { Remove-Item $hbcFile -Force }
& $hermesc -emit-binary -out $hbcFile $bundleFile
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $hbcFile)) {
    throw "Hermes bytecode compilation failed with exit code $LASTEXITCODE"
}
$hbcSize = [math]::Round((Get-Item $hbcFile).Length / 1MB, 2)
Write-Host "Hermes Bytecode generated successfully ($($hbcSize) MB)" -ForegroundColor Green

# STEP 3: APK Injection & WebP Icon Replacement
Write-Host "`n[3/5] Injecting Hermes Bytecode into Standalone APK..." -ForegroundColor Yellow
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression") | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null

Copy-Item $backupApk $unsignedApk -Force
$zip = [System.IO.Compression.ZipFile]::Open($unsignedApk, [System.IO.Compression.ZipArchiveMode]::Update)

# Replace index.android.bundle
$bundleEntry = $zip.GetEntry("assets/index.android.bundle")
if ($bundleEntry -ne $null) {
    $bundleEntry.Delete()
}
$null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $hbcFile, "assets/index.android.bundle")

# Replace icons with genuine WebP
$iconMappings = @{
    "res/d2.webp" = "$realWebpDir\d2.webp"
    "res/MO.webp" = "$realWebpDir\MO.webp"
    "res/qs.webp" = "$realWebpDir\qs.webp"
    "res/Sn.webp" = "$realWebpDir\Sn.webp"
    "res/sK.webp" = "$realWebpDir\sK.webp"
    "res/Nt.webp" = "$realWebpDir\Nt.webp"
    "res/13.webp" = "$realWebpDir\13.webp"
    "res/9Q.webp" = "$realWebpDir\9Q.webp"
    "res/iE.webp" = "$realWebpDir\iE.webp"
    "res/5c.webp" = "$realWebpDir\5c.webp"
    "res/yw.webp" = "$realWebpDir\yw.webp"
    "res/fq.webp" = "$realWebpDir\fq.webp"
    "res/u5.webp" = "$realWebpDir\u5.webp"
    "res/j_.webp" = "$realWebpDir\j_.webp"
    "res/-6.webp" = "$realWebpDir\-6.webp"
}

foreach ($entryName in $iconMappings.Keys) {
    $sourcePath = $iconMappings[$entryName]
    if (Test-Path $sourcePath) {
        $oldEntry = $zip.GetEntry($entryName)
        if ($oldEntry -ne $null) {
            $oldEntry.Delete()
        }
        $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $sourcePath, $entryName)
    }
}

# Strip META-INF signatures
$entriesToRemove = @($zip.Entries | Where-Object { $_.FullName -like "META-INF/*" })
foreach ($entry in $entriesToRemove) {
    $entry.Delete()
}
$zip.Dispose()
Write-Host "[OK] Bytecode and icons injected into APK" -ForegroundColor Green

# STEP 4: Zipalign (4-byte alignment)
Write-Host "`n[4/5] Running zipalign optimization..." -ForegroundColor Yellow
if (Test-Path $alignedApk) { Remove-Item $alignedApk -Force }
& $zipalign -f -p 4 $unsignedApk $alignedApk
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $alignedApk)) {
    throw "zipalign failed with exit code $LASTEXITCODE"
}
Write-Host "[OK] APK aligned successfully" -ForegroundColor Green

# STEP 5: Signing with apksigner (v1, v2, v3)
Write-Host "`n[5/5] Signing APK with apksigner..." -ForegroundColor Yellow
if (Test-Path $finalApk) { Remove-Item $finalApk -Force }
& $apksigner sign --ks $keystore --ks-pass pass:android --ks-key-alias androiddebugkey --out $finalApk $alignedApk
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $finalApk)) {
    throw "apksigner failed with exit code $LASTEXITCODE"
}

# Verify Signature
Write-Host "`nVerifying APK signature..." -ForegroundColor Cyan
& $apksigner verify -v $finalApk

# Copy to mobile directory as well
Copy-Item $finalApk $mobileFinalApk -Force

# Clean up intermediates
Remove-Item $unsignedApk -Force -ErrorAction SilentlyContinue
Remove-Item $alignedApk -Force -ErrorAction SilentlyContinue
Remove-Item $bundleFile -Force -ErrorAction SilentlyContinue
Remove-Item $hbcFile -Force -ErrorAction SilentlyContinue

$sw.Stop()
$finalItem = Get-Item $finalApk
$apkMb = [math]::Round($finalItem.Length / 1MB, 2)
$elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 1)

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   BUILD SUCCEEDED! APK READY FOR INSTALLATION ($($elapsed) s)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "APK File : $($finalItem.FullName)" -ForegroundColor White
Write-Host "File Size: $apkMb MB" -ForegroundColor White
Write-Host "Modified : $($finalItem.LastWriteTime)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
