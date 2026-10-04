# PowerShell script to push School ERP code to GitHub
param(
    [string]$RepoUrl = "https://github.com/ANAND2023/school-erp.git"
)

Write-Host "Configuring git remote for: $RepoUrl" -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin $RepoUrl
git branch -M main

Write-Host "Pushing code to GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Code successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Please ensure you have created the repository on https://github.com/new and are logged in to git." -ForegroundColor Red
}
