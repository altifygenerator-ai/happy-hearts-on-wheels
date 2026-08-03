#!/usr/bin/env sh
set -eu
rm -rf app/admin app/api/admin lib/admin-auth.ts lib/order-notifications.ts supabase tsconfig.tsbuildinfo
printf '%s\n' 'Legacy admin/Supabase files removed. Commit these deletions before redeploying.'
