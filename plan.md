1. **Import Icons:** Import `Lock` and `XCircle` from `lucide-react` in `src/pages/pickem/PickEmPage.tsx`.
2. **Update Pick Style Logic:**
    * In `src/pages/pickem/PickEmPage.tsx`, map the pick's status (`pick?.status`) to the specified colors.
    * An upcoming pick (`pick.status === 'PENDING'` AND `!isLocked`) should be white.
    * A pick in an in-progress/pending game (`pick.status === 'PENDING'` AND `isLocked`) should be grey with a padlock icon.
    * A winning pick (`pick.status === 'WIN'`) should be green with a check mark.
    * A losing pick (`pick.status === 'LOSS'`) should be red with an X mark.
    * A pushing pick (`pick.status === 'PUSH'`) could be a neutral color, or default to standard.
3. **Refactor the buttons:**
    * Inside the `.map(m => ...)` for the matchups, when rendering the "away" and "home" buttons, calculate a specific style object based on whether the button corresponds to the user's pick and the status of that pick.
    * Remove the default checkmark logic and replace it with a switch-case or nested ternary based on the status mapping above.
4. **Pre-commit checks**: Call `pre_commit_instructions` tool to get the required checks to ensure proper testing, verification, review, and reflection are done.
