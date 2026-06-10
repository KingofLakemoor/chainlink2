import fs from 'fs';

let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

const replacement = `  const handleSubmitPicks = async () => {
    if (!user || !activeSegmentId) return;
    if (picks.some(p => p === null)) return;

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

      setHasSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting Link4 picks:', error);
      alert(error.message || 'Failed to submit picks. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };`;

content = content.replace(/  const handleSubmitPicks = async \(\) => {[\s\S]*?  };/m, replacement);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content, 'utf8');
