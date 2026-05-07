1.  **Update `AdminDashboard.tsx` to display Over/Under fields**:
    -   In `AdminDashboard.tsx`, within the `AdminEditMatchup` component, right under where it conditionally renders the "Spread" input when `matchup.type === 'SPREAD'`, add a conditional render for the "Over/Under" input when `matchup.type === 'OVER_UNDER'`.
    -   Bind this input to `matchup.metadata.overUnder` with `handleChange('metadata.overUnder', parseFloat(e.target.value) || 0)`.

2.  **Update `CreateMatchupPage.tsx` to handle Metadata fields**:
    -   The `formData` state needs to be expanded to include `metadata: { spread?: number, overUnder?: number }` or handle it specifically when selecting the type.
    -   Alternatively, add input fields for "Spread" and "Over/Under" that appear depending on the selected `type`, similar to how they will appear in `AdminDashboard.tsx`.

3.  **Update Auto-titling logic**:
    -   In `AdminDashboard.tsx`, when `field === 'type' && value === 'OVER_UNDER'`, automatically set the title to `O/U ${matchup.metadata.overUnder || ''} - ${awayName} @ ${homeName}`. (Or whatever formatting is standard, maybe just `${awayName} @ ${homeName} - O/U`). Wait, let's keep it simple, maybe just `${awayName} @ ${homeName} - O/U`.

4.  **Complete pre-commit steps**.
