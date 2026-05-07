const { execSync } = require('child_process');
// Seed script for dev environment where FIREBASE_SERVICE_ACCOUNT_KEY is needed
// However, since we mock it in Playwright dev env via VITE_... variables, maybe we can just bypass the admin sdk
// or manually inject a document?
