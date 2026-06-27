const fs = require('fs');

const path = 'src/pages/brackets/BracketsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { Trophy, Loader2 } from 'lucide-react';",
  "import { Trophy, Loader2, Layers } from 'lucide-react';"
);

content = content.replace(
  "import { db } from '../../lib/firebase';",
  "import { db } from '../../lib/firebase';\nimport { useAuth } from '../../lib/auth-context';"
);

content = content.replace(
  "  const { bracketId } = useParams<{ bracketId: string }>();\n  const [bracket, setBracket] = useState<any>(null);\n  const [loading, setLoading] = useState(true);",
  "  const { bracketId } = useParams<{ bracketId: string }>();\n  const { user } = useAuth();\n  const [bracket, setBracket] = useState<any>(null);\n  const [loading, setLoading] = useState(true);\n  const [activeTab, setActiveTab] = useState<'bracket' | 'leaderboard'>('bracket');\n  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);\n  const [leaderboardLoading, setLeaderboardLoading] = useState(false);"
);


const newUseEffect = `  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!bracket || activeTab !== 'leaderboard') return;
      setLeaderboardLoading(true);
      try {
        const pQuery = query(
          collection(db, 'bracketGamePredictions'),
          where('bracketId', '==', bracket.id)
        );
        const pSnap = await getDocs(pQuery);

        const participantStats: Record<string, { points: number, uid: string }> = {};

        pSnap.docs.forEach(d => {
          const data = d.data();
          participantStats[data.userId] = { points: 0, uid: data.userId };
        });

        const participantIds = Object.keys(participantStats);

        if (participantIds.length > 0) {
          const uidsParam = participantIds.join(',');
          const token = await user?.getIdToken();
          const res = await fetch(\`/api/users/public?uids=\${uidsParam}\`, {
            headers: { 'Authorization': \`Bearer \${token}\` }
          });

          let usersMap: Record<string, any> = {};
          if (res.ok) {
            const data = await res.json();
            const usersList = data.users || [];
            usersList.forEach((u: any) => { usersMap[u.id] = u; });
          }

          const formattedLeaderboard = participantIds.map(uid => ({
             uid,
             name: usersMap[uid]?.username || usersMap[uid]?.displayName || 'Unknown User',
             avatar: usersMap[uid]?.image || usersMap[uid]?.avatarUrl || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${uid}\`,
             ...participantStats[uid]
          })).sort((a, b) => b.points - a.points);

          setLeaderboardData(formattedLeaderboard);
        } else {
          setLeaderboardData([]);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
  }, [bracket, activeTab, user]);

  const theme = bracket?.theme || {};`;

content = content.replace("  const theme = bracket?.theme || {};", newUseEffect);

const originalUI = `        <div className="w-full">
          <div className="mb-6 max-w-7xl mx-auto flex items-center justify-between">
             <h2 className="text-xl font-bold text-white">{bracket.name}</h2>
             <span className="text-sm text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full">
               Points per round: {Object.values(bracket.pointValues).join(' / ')}
             </span>
          </div>
          <WorldCupBracket bracket={bracket} />
        </div>`;

const newUI = `        <div className="w-full">
          <div className="mb-6 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">{bracket.name}</h2>
              <span className="text-sm text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full whitespace-nowrap hidden md:inline-block">
                Points per round: {Object.values(bracket.pointValues).join(' / ')}
              </span>
            </div>

            <div className="flex bg-[#121212] p-1 rounded-xl border border-zinc-800 self-start">
              <button
                onClick={() => setActiveTab('bracket')}
                className={\`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 \${
                  activeTab === 'bracket'
                    ? 'text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }\`}
                style={activeTab === 'bracket' ? { backgroundColor: primaryColor, boxShadow: \`0 10px 15px -3px \${primaryColor}33\` } : undefined}
              >
                <Layers className="w-4 h-4" />
                Bracket
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={\`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 \${
                  activeTab === 'leaderboard'
                    ? 'text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }\`}
                style={activeTab === 'leaderboard' ? { backgroundColor: primaryColor, boxShadow: \`0 10px 15px -3px \${primaryColor}33\` } : undefined}
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </button>
            </div>
          </div>

          {activeTab === 'bracket' && <WorldCupBracket bracket={bracket} />}

          {activeTab === 'leaderboard' && (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden max-w-7xl mx-auto">
              {leaderboardLoading ? (
                <div className="p-12 text-center text-zinc-500 font-medium flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: primaryColor }} />
                  Loading leaderboard...
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-medium">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                  No one has entered this bracket yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                        <th className="px-6 py-4 font-medium">Participant</th>
                        <th className="px-6 py-4 font-medium text-center">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {leaderboardData.map((participant, index) => (
                        <tr
                          key={participant.uid}
                          className={\`hover:bg-zinc-800/20 transition-colors\`}
                          style={participant.uid === user?.uid ? { backgroundColor: \`\${primaryColor}1A\` } : undefined}
                        >
                          <td className="px-6 py-4 text-center">
                            <span className={\`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold \${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                              index === 1 ? 'bg-zinc-300/20 text-zinc-300' :
                              index === 2 ? 'bg-orange-500/20 text-orange-500' :
                              'text-zinc-500'
                            }\`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={participant.avatar} alt="" className="w-8 h-8 rounded-full bg-zinc-800" />
                              <span className={\`font-medium \${participant.uid === user?.uid ? 'text-white' : 'text-zinc-300'}\`}>
                                {participant.name}
                              </span>
                              {participant.uid === user?.uid && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">You</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-white">
                            {participant.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>`;
content = content.replace(originalUI, newUI);

fs.writeFileSync(path, content, 'utf8');
