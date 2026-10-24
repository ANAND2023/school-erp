@echo off
setlocal
echo ===================================================
echo     School ERP - Mobile APK Build Script
echo ===================================================
echo.

:: 1. Setup Java 17 and Android SDK
set "JAVA_HOME=D:\Android\gradle_user_home\jdks\eclipse_adoptium-17-amd64-windows.2"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=D:\Android\sdk"
set "GRADLE_USER_HOME=D:\Android\gradle_user_home"
set "TMP=D:\Android\tmp"
set "TEMP=D:\Android\tmp"
set "_JAVA_OPTIONS="

echo [1/4] Checking Java and Android SDK...
"%JAVA_HOME%\bin\java.exe" -version
if errorlevel 1 (
    echo [ERROR] Java 17 not found at %JAVA_HOME%
    exit /b 1
)
echo Android SDK: %ANDROID_HOME%
echo Gradle User Home: %GRADLE_USER_HOME%
echo.

:: 2. Clean previous build caches
echo [2/4] Cleaning stale native and build caches...
if exist "D:\erp\mobile\android\app\.cxx" rmdir /s /q "D:\erp\mobile\android\app\.cxx"
if exist "D:\erp\mobile\node_modules\expo-modules-core\android\.cxx" rmdir /s /q "D:\erp\mobile\node_modules\expo-modules-core\android\.cxx"
echo Caches cleaned.
echo.

:: 3. Run Gradle assembleRelease
echo [3/4] Building Release APK (this takes 2-4 minutes)...
cd /d "D:\erp\mobile\android"
call gradlew.bat assembleRelease --gradle-user-home "D:\Android\gradle_user_home"

if errorlevel 1 (
    echo.
    echo [ERROR] APK Build Failed! Please check the logs above.
    exit /b 1
)

:: 4. Copy generated APK to easy-to-access locations
echo.
echo [4/4] Copying APK to root directory...
if exist "D:\erp\mobile\android\app\build\outputs\apk\release\app-release.apk" (
    copy /y "D:\erp\mobile\android\app\build\outputs\apk\release\app-release.apk" "D:\erp\SchoolERP-Release.apk"
    copy /y "D:\erp\mobile\android\app\build\outputs\apk\release\app-release.apk" "D:\erp\mobile\SchoolERP-Release.apk"
    echo.
    echo ===================================================
    echo     SUCCESS! APK GENERATED SUCCESSFULLY!
    echo ===================================================
    echo File Location: D:\erp\SchoolERP-Release.apk
    echo.
) else (
    echo [ERROR] Output APK was not found at expected path.
    exit /b 1
)

endlocal
