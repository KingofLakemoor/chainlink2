Wait, if they already signed in with Google, and then try to login/signup with Email/Password:
If we catch `email-already-in-use` during `signupWithEmail`, we can fetch sign in methods. If it's Google, we tell them to login with Google.

What if we want to programmatically link?
"If a user signs in with email/password or Google and the email matches an existing account, this is one account."

If the user is trying to `loginWithEmail`, and they succeed, we can't link Google automatically because they didn't provide Google credentials.
Wait! What if we catch `auth/account-exists-with-different-credential` in `loginWithGoogle` and we CANNOT link without a password? But we can prompt them to log in with email and password.

Actually, is there a way to link without a password? No.

BUT what if `loginWithGoogle` is called, fails with `auth/account-exists-with-different-credential`, and returns a special error?

Let's look at the UI in `Landing.tsx`. It has an email field and password field, AND a Google button.
What if `loginWithGoogle` does this:
```javascript
import { fetchSignInMethodsForEmail } from 'firebase/auth';

  } catch (error: any) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email;
      if (email) {
        throw new Error(`An account already exists with ${email}. Please sign in with Email/Password.`);
      }
    }
```
Wait, if the user has an email account, and they click "Sign in with Google", they get `account-exists-with-different-credential`. We catch it and throw the error message. Then the user goes and logs in with Email/Password.
Is that enough? The instructions say "If a user signs in with email/password or Google and the email matches an existing account, this is one account."
This might mean: "Link the accounts so they can use either!"
If they log in with Email/Password, can we link Google? Yes, if we call `linkWithCredential(user, googleCredential)` - BUT we only have the `googleCredential` when `signInWithPopup` fails.
If `signInWithPopup` fails, we get the `googleCredential`. But then we need the user to type their password. The user hasn't typed their password in the UI if they just clicked the Google button! We'd have to save the `googleCredential`, wait for them to log in with password, then link. That's complicated.

What if we use `signInWithCredential`? No, we have to sign in with password first.
What if we change the Firebase setting to allow multiple accounts with the same email? "Link accounts that use the same email" is a Firebase project setting. But I don't have access to the Firebase console.

Wait! What if they click "Sign up" with an email that is already used for Google?
`createUserWithEmailAndPassword` throws `auth/email-already-in-use`. We can tell them to sign in with Google.

What if we modify `loginWithGoogle` to automatically do this if we DO have the password? We don't have the password.
Wait, can `loginWithGoogle` prompt them? No.

Maybe the issue is that in `loginWithGoogle`, we don't handle `auth/account-exists-with-different-credential` at all, so it falls back to `signInWithRedirect`, which loops and fails silently!
Yes! `loginWithGoogle` catches the error and does `signInWithRedirect`:
```javascript
  } catch (error: any) {
    console.warn('Popup login failed, falling back to redirect', error);
    try {
      await signInWithRedirect(auth, provider);
    } catch (redirectError: any) {
      console.error('Redirect login failed', redirectError);
      throw redirectError;
    }
  }
```
If the error is `account-exists-with-different-credential`, it falls back to redirect, which redirects the page. But when the page reloads, `handleAuthRedirect` runs, gets the SAME error (`account-exists-with-different-credential`), and throws it:
```javascript
export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      // ...
    }
  } catch (error) {
    console.error('Error handling redirect result', error);
    throw error;
  }
};
```
But `handleAuthRedirect` doesn't pass the error to the UI! It's called in `useEffect` in `AuthProvider`:
```javascript
    // Process redirect result if coming back from Google login
    handleAuthRedirect().catch(console.error);
```
So the user gets NO ERROR MESSAGE in the UI! They just get redirected, it fails, and they are left on the login page with nothing happening! This is the exact bug!

So the fix is to handle `auth/account-exists-with-different-credential` in BOTH `loginWithGoogle` AND `handleAuthRedirect`! Wait, no, we shouldn't even fallback to `signInWithRedirect` if the error is `auth/account-exists-with-different-credential` because it's not a popup blocker issue, it's an account issue!

Let's change `loginWithGoogle`:
```typescript
  try {
    const userCredential = await signInWithPopup(auth, provider);
    if (userCredential && userCredential.user) {
      await ensureUserProfile(userCredential.user);
    }
  } catch (error: any) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email;
      throw new Error(`An account already exists with the same email. Please sign in using your Email/Password.`);
    }
    console.warn('Popup login failed, falling back to redirect', error);
    try {
      await signInWithRedirect(auth, provider);
    } catch (redirectError: any) {
      console.error('Redirect login failed', redirectError);
      throw redirectError;
    }
  }
```
Wait, the instruction says: "If a user signs in with email/password or Google and the email matches an existing account, this is one account."
This might mean we SHOULD link them automatically if possible.
Wait! Is it possible to use `fetchSignInMethodsForEmail`?
If they try to login with Google, and the account exists with Email/Password. We catch `account-exists-with-different-credential`. We tell them to login with Email.
What if they try to sign UP with Email/Password, and they have a Google account?
It throws `auth/email-already-in-use`. We can catch it, and say "An account already exists with this email. Please sign in with Google."
What if they try to sign IN with Email/Password, and they have a Google account?
Firebase allows this if they set a password! But if they didn't, `signInWithEmailAndPassword` throws `auth/wrong-password` or `auth/user-not-found`? No, it throws `auth/invalid-credential` or `auth/wrong-password` if they have a Google account but no password.

Let's search Google for how to handle "Firebase Authentication link accounts with same email Google and Email/Password".
Actually, wait, we CAN link them.
If a user signs in with Google, and they have an Email/Password account:
We can't automatically link without the password.
But wait! If they sign in with Email/Password, and they HAVE a Google account, they CAN link it.
But how would they link it? There's no UI for it.

Maybe we are supposed to catch `auth/account-exists-with-different-credential` in `loginWithGoogle`, save the `pendingCredential` to state, and prompt for password? We can't change the UI that much if the instruction is simple.

Let me re-read the instruction carefully:
"If a user signs in with email/password or Google and the email matches an existing account, this is one account."

Wait! There's a feature in Google Cloud / Firebase called "Link accounts that use the same email". If this is TURNED OFF, then two accounts with the same email can be created!
But if it's turned on, it throws the error.
Since we don't have access to the console, we have to handle it in code.

What if we catch `auth/account-exists-with-different-credential` and we use `GoogleAuthProvider.credentialFromError(error)` to link it later? We don't have a place to do that.

Let me use the exact string from the knowledge base:
"The agent should be advised to use its web search tool to find Firebase documentation for linking auth providers (specifically `linkWithCredential` in the Firebase Auth SDK)."

Let me search for this:
