import fs from 'fs';

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

// Update state and Segment fetch
const newStates = `  const [segmentCost, setSegmentCost] = useState(10);
  const [savedPicksCount, setSavedPicksCount] = useState(0);
  const [hasLoss, setHasLoss] = useState(false);`;
content = content.replace(/  const \[timeLeft, setTimeLeft\] = useState<\{ days: number; hours: number; minutes: number; seconds: number \} \| null>\(null\);/m, `  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);\n${newStates}`);

const segmentFetch = `          if (activeSegment.endTime) setEndTime(activeSegment.endTime);
          if (activeSegment.allowedSports) setAllowedSports(activeSegment.allowedSports);
          if (activeSegment.theme) setTheme(activeSegment.theme);
          if (activeSegment.cost !== undefined) setSegmentCost(activeSegment.cost);`;
content = content.replace(/          if \(activeSegment\.endTime\) setEndTime\(activeSegment\.endTime\);\n          if \(activeSegment\.allowedSports\) setAllowedSports\(activeSegment\.allowedSports\);\n          if \(activeSegment\.theme\) setTheme\(activeSegment\.theme\);/m, segmentFetch);

// Update fetchUserPicks
const fetchUserPicks = `    const fetchUserPicks = async () => {
      try {
        const q = query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data.picks) {
             const userPicks = Array.isArray(data.picks) ? data.picks : Object.values(data.picks);

             // Check if user has loss
             if (data.hasLoss) {
               setHasLoss(true);
             }

             // Pad picks up to 4
             const paddedPicks = [...userPicks];
             while (paddedPicks.length < 4) paddedPicks.push(null);

             setPicks(paddedPicks as (Link4Pick | null)[]);
             setSavedPicksCount(userPicks.length);
             if (userPicks.length >= 4) {
                setHasSubmitted(true);
             }
          }
        }
      } catch (error) {`;
content = content.replace(/    const fetchUserPicks = async \(\) => \{[\s\S]*?\} catch \(error\) \{/m, fetchUserPicks);

// Update submit and clear logic
const submitLogic = `  const clearPicks = () => {
    if (hasSubmitted || hasLoss) return;
    // Only clear the unsaved draft pick, keep saved ones
    const newPicks = [...picks];
    for(let i = savedPicksCount; i < 4; i++) {
        newPicks[i] = null;
    }
    setPicks(newPicks);
  };

  const nextPickIndex = picks.findIndex(p => p === null);
  // Unsaved pick count
  const unsavedPicksCount = picks.filter(p => p !== null).length - savedPicksCount;

  const handleSlotClick = (index: number) => {
    if (hasLoss) return;
    if (index === nextPickIndex) {
      setIsSelectingPick(true);
    }
  };

  const handleMakePick = (matchup: any, team: any) => {
    if (nextPickIndex === -1 || hasSubmitted || hasLoss) return;

    const newPicks = [...picks];
    newPicks[nextPickIndex] = {
      id: \`pick-\${matchup.gameId}\`,
      name: team.name,
      sport: matchup.league,
      startTime: matchup.startTime,
    };
    setPicks(newPicks);
    setIsSelectingPick(false);
  };

  const handleSubmitPicks = async () => {
    if (!user || !activeSegmentId) return;
    if (unsavedPicksCount === 0) return;

    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/link4/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${idToken}\`
        },
        body: JSON.stringify({
          segmentId: activeSegmentId,
          picks: picks,
          username: (user as any).username || 'Anonymous',
          avatarUrl: (user as any).avatarUrl || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${user.uid}\`
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit picks');
      }

      setSavedPicksCount(picks.filter(p => p !== null).length);
      if (picks.filter(p => p !== null).length >= 4) {
         setHasSubmitted(true);
      }
    } catch (error: any) {
      console.error('Error submitting Link4 picks:', error);
      alert(error.message || 'Failed to submit picks. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };`;
content = content.replace(/  const clearPicks = \(\) => \{[\s\S]*?    \} finally \{\n      setIsSubmitting\(false\);\n    \}\n  \};/m, submitLogic);

// Fix filter constraint
const filterConstraint = `    if (nextPickIndex > 0 && picks[nextPickIndex - 1]) {
      const prevPick = picks[nextPickIndex - 1];`;
content = content.replace(/    if \(nextPickIndex > 0\) \{\n      const prevPick = picks\[nextPickIndex - 1\];/m, filterConstraint);

// UI tweaks
const uiTweaks = `            <p className="text-zinc-400 text-lg">
            Connect four to win! Play Link4 and earn links. Entry: {segmentCost} links.
            {theme.sponsorName && (`;
content = content.replace(/            Connect four to win! Play Link4 and earn links\.\n            \{theme\.sponsorName && \(/m, uiTweaks);

const submissionBox = `          {unsavedPicksCount > 0 && !hasLoss && (
            <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <h3 className="text-lg font-bold text-white mb-2">Ready to Submit?</h3>
              <p className="text-zinc-400 mb-4">Once you submit, your pick is locked for this Link4 segment.</p>
              <button
                onClick={handleSubmitPicks}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
              >
                {isSubmitting ? 'Submitting...' : \`Lock Pick \${picks.filter(p => p !== null).length} \${savedPicksCount === 0 ? \`(Costs \${segmentCost} Links)\` : ''}\`}
              </button>
            </div>
          )}

          {hasSubmitted && !hasLoss && (
            <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Picks Complete!</h3>
              <p className="text-zinc-400">Good luck! You've filled out your entire Link4 selection.</p>
            </div>
          )}

          {hasLoss && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Eliminated</h3>
              <p className="text-red-400">You lost a pick and have been eliminated from this segment.</p>
            </div>
          )}`;
content = content.replace(/          \{nextPickIndex === -1 && !hasSubmitted && \([\s\S]*?selection\.<\/p>\n            <\/div>\n          \)\}/m, submissionBox);


// Leaderboard padding
const leaderboardPicks = `           // Calculate potential score by assuming PENDING games are WINs
           processedPicks.forEach((pick: any) => {`;
content = content.replace(/           \/\/ Calculate potential score by assuming PENDING games are WINs\n           processedPicks\.forEach\(\(pick: any\) => \{/m, "           // Pad to 4 for UI\n           while (processedPicks.length < 4) processedPicks.push({ status: 'EMPTY' });\n\n" + leaderboardPicks);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content, 'utf8');
