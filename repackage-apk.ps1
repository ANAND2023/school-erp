$env:JAVA_HOME = "C:\Program Files\Android\openjdk\jdk-21.0.8"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH

[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression") | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null

$backupApk = "D:\erp\SchoolERP-Backup.apk"
$unsignedApk = "D:\erp\SchoolERP-Unsigned.apk"
$alignedApk = "D:\erp\SchoolERP-Aligned.apk"
$finalApk = "D:\erp\SchoolERP-Release.apk"
$hbcFile = "D:\erp\mobile\index.android.hbc"

Write-Host "1. Checking Hermes bytecode file..."
if (-not (Test-Path $hbcFile)) {
    throw "Bytecode file not found: $hbcFile"
}
$hbcItem = Get-Item $hbcFile
Write-Host "Bytecode file size: $($hbcItem.Length) bytes, Last modified: $($hbcItem.LastWriteTime)"

Write-Host "2. Copying backup APK to Unsigned APK..."
Copy-Item $backupApk $unsignedApk -Force

Write-Host "3. Updating assets/index.android.bundle and stripping META-INF signatures..."
$zip = [System.IO.Compression.ZipFile]::Open($unsignedApk, [System.IO.Compression.ZipArchiveMode]::Update)
$bundleEntry = $zip.GetEntry("assets/index.android.bundle")
if ($bundleEntry -ne $null) {
    Write-Host "Removing existing assets/index.android.bundle (size: $($bundleEntry.Length))..."
    $bundleEntry.Delete()
}

Write-Host "Adding new Hermes compiled assets/index.android.bundle..."
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $hbcFile, "assets/index.android.bundle")

$entriesToRemove = @($zip.Entries | Where-Object { $_.FullName -like "META-INF/*" })
Write-Host "Removing $($entriesToRemove.Count) old signature entries from META-INF/..."
foreach ($entry in $entriesToRemove) {
    $entry.Delete()
}
$zip.Dispose()

Write-Host "4. Running zipalign..."
if (Test-Path $alignedApk) { Remove-Item $alignedApk -Force }
$zipalign = "D:\Android\sdk\build-tools\35.0.0\zipalign.exe"
& $zipalign -f -p 4 $unsignedApk $alignedApk

Write-Host "5. Signing with apksigner..."
$apksigner = "D:\Android\sdk\build-tools\35.0.0\apksigner.bat"
$keystore = "D:\erp\mobile\android\app\debug.keystore"
if (Test-Path $finalApk) { Remove-Item $finalApk -Force }
& $apksigner sign --ks $keystore --ks-pass pass:android --ks-key-alias androiddebugkey --out $finalApk $alignedApk

Write-Host "6. Verifying signature..."
& $apksigner verify -v $finalApk

Write-Host "7. Copying to mobile directory..."
Copy-Item $finalApk "D:\erp\mobile\SchoolERP-Release.apk" -Force

Remove-Item $unsignedApk -Force -ErrorAction SilentlyContinue
Remove-Item $alignedApk -Force -ErrorAction SilentlyContinue

Write-Host "=== BUILD AND SIGNING COMPLETED SUCCESSFULLY! ==="
Get-Item $finalApk | Format-List Name, FullName, Length, LastWriteTime
