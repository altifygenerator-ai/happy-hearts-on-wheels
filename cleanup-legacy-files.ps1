$ErrorActionPreference = "Stop"
$paths = @(
  "app/admin",
  "app/api/admin",
  "lib/admin-auth.ts",
  "lib/order-notifications.ts",
  "supabase",
  "tsconfig.tsbuildinfo"
)
foreach ($path in $paths) {
  if (Test-Path $path) {
    Remove-Item -Recurse -Force $path
    Write-Host "Removed $path"
  }
}
Write-Host "Legacy admin/Supabase files removed. Commit these deletions before redeploying."
