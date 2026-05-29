1. Remove references to `session.subscription_data` and properly fetch the `subscription` from the API via `stripe.subscriptions.retrieve` inside `apiRouter.ts`.
2. Do not fallback to `coins`, but rather continue utilizing `links` internally as per the codebase modifications.
3. Use `git diff` or `read_file` to verify that the changes were applied correctly.
4. Run `npm run lint` and `npm run build` to confirm the typescript build errors are resolved.
5. Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
6. Once completed, submit the changes.
