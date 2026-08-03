/** Legacy compatibility shim. The website no longer has a private order dashboard. */
export const ADMIN_COOKIE_NAME = "happy_hearts_admin_retired";
export function adminIsConfigured() { return false; }
export function createAdminToken() { return ""; }
export function validAdminPassword() { return false; }
export function requestIsAdmin() { return false; }
