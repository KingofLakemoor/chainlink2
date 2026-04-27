const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state variables for upcoming picks
content = content.replace(
  "const [allFetchedMatchups, setAllFetchedMatchups] = useState<any[]>([]);",
  "const [allFetchedMatchups, setAllFetchedMatchups] = useState<any[]>([]);\n  const [globalUpcomingPicks, setGlobalUpcomingPicks] = useState<any[]>([]);"
);

// 2. Fetch all upcoming picks
let fetchPicksReplacement = `
    const fetchPicks = async () => {
      const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
      const pickSnap = await getDocs(q);
      const picksInfo: Record<string, any> = {};
      pickSnap.docs.forEach(d => {
        const data = d.data();
        picksInfo[data.matchupId] = data;
      });
      setUserPicks(picksInfo);

      // Fetch all pending picks for global hot rating
      const globalQ = query(collection(db, 'picks'), where('status', '==', 'PENDING'));
      const globalPickSnap = await getDocs(globalQ);
      const allUpcomingPicks = globalPickSnap.docs.map(d => d.data());
      setGlobalUpcomingPicks(allUpcomingPicks);
    };`;

content = content.replace(
  /const fetchPicks = async \(\) => {[\s\S]*?setUserPicks\(picksInfo\);\n    };/,
  fetchPicksReplacement
);

// 3. Mock data for DEV
let mockReplacement = `
       const mockMatchups = [
            {
                id: 'mock-1',
                title: 'Who will win? Mock Team A @ Mock Team B',
                league: 'EPL',
                status: 'STATUS_SCHEDULED',
                startTime: Date.now() + 1000000,
                statusDesc: 'Upcoming',
                cost: 10,
                awayTeam: { id: 'teamA', name: 'Mock Team A', image: 'https://via.placeholder.com/150', score: 0 },
                homeTeam: { id: 'teamB', name: 'Mock Team B', image: 'https://via.placeholder.com/150', score: 0 },
                metadata: {}
            }
        ];

       const handleMockMatchups = (e: any) => {
         if (e.detail && e.detail.matchups) {
           setAllFetchedMatchups(e.detail.matchups);
         }
       };
       window.addEventListener('mock-matchups', handleMockMatchups);

       setAllFetchedMatchups(mockMatchups);

       // Mock upcoming picks for hot rating visual
       setGlobalUpcomingPicks([
         { matchupId: 'mock-1', pick: { id: 'teamA' }, status: 'PENDING' },
         { matchupId: 'mock-1', pick: { id: 'teamA' }, status: 'PENDING' },
         { matchupId: 'mock-1', pick: { id: 'teamB' }, status: 'PENDING' }
       ]);
`;

content = content.replace(
  /const mockMatchups = \[[\s\S]*?setAllFetchedMatchups\(mockMatchups\);/,
  mockReplacement
);

fs.writeFileSync('src/App.tsx', content);
