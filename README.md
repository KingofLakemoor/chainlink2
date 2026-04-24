<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h2>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>

## Firebase Agent Skills and Authentication

The project uses Firebase for Authentication and Firestore. Here are the key skills and conventions for this project:

- **Authentication Method:** Primarily use `signInWithPopup` to handle Google Sign-In, falling back to `signInWithRedirect` if necessary, to resolve production login issues.
- **Google Auth Provider:** When setting up the `GoogleAuthProvider`, use `provider.setCustomParameters({ prompt: 'select_account' })` to guarantee the user is prompted to select their account.
- **API Key Handling:** To prevent 'invalid action' errors during Firebase Authentication, ensure the `apiKey` loaded from dynamic config or environment variables is actively `.trim()`ed before passing it to `initializeApp`.
- **Local Mock Authentication:**
  - Mock user data injection must strictly be conditionally wrapped using `import.meta.env.DEV` to prevent unintended privilege escalation or security vulnerabilities in production.
  - Local mock authentication is implemented by dispatching custom `mock-login` and `mock-logout` window events from `src/lib/firebase.ts`. These are intercepted by `src/lib/auth-context.tsx` to conditionally inject a mock User and profile when in development mode without a valid API key.
- **Firebase Admin SDK:**
  - For local development, the Firebase Admin SDK requires credentials. This can be satisfied either by downloading a service account JSON file and pointing `GOOGLE_APPLICATION_CREDENTIALS` to it, or by establishing Application Default Credentials directly via the Google Cloud CLI (`gcloud auth application-default login`).
  - The backend is designed for deployment on Cloud Run via AI Studio, utilizing `applicationDefault()` for Firebase Admin SDK credentials.
