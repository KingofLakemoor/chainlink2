import fs from 'fs';

let content = fs.readFileSync('src/pages/play/PlayDashboard.tsx', 'utf8');

const forfeitFunction = `
  const handleForfeitPick = async (matchup: any) => {
    if (!user || !profile) return;

    if (window.confirm("Are you sure you want to forfeit this pick? You will receive a loss and lose your streak.")) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/picks/forfeit-pick', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${idToken}\`
          },
          body: JSON.stringify({ matchupId: matchup.gameId })
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to forfeit pick');
        }
      } catch (error) {
        console.error("Failed to forfeit pick", error);
        alert(error.message || "Failed to forfeit pick.");
      }
    }
  };
`;

const insertIndex = content.indexOf('  const handleCancelPick');
content = content.slice(0, insertIndex) + forfeitFunction + '\n' + content.slice(insertIndex);

// Also need to add onForfeitPick={handleForfeitPick} to all MatchupCard instances
content = content.replace(/onCancelPick=\{handleCancelPick\}/g, 'onCancelPick={handleCancelPick}\n              onForfeitPick={handleForfeitPick}');

fs.writeFileSync('src/pages/play/PlayDashboard.tsx', content, 'utf8');
