const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Using regex to replace the setupPicksListeners block safely
code = code.replace(/const setupPicksListeners = \(\) => {[\s\S]*?setUserPicks\(picksInfo\);\n      }\);\n/,
`const setupPicksListeners = () => {
      if (user) {
        const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
        unsubPicks = onSnapshot(q, (pickSnap) => {
          const picksInfo: Record<string, any> = {};
          pickSnap.docs.forEach(d => {
            const data = d.data();
            picksInfo[data.matchupId] = data;
          });
          setUserPicks(picksInfo);
        });
      } else {
        setUserPicks({});
      }
`);

// 3. Add `user` to the useEffect dependency array
code = code.replace(/}, \[\]\);/g, '}, [user]);');

// 4. Update isPickDisabled
code = code.replace(/const isPickDisabled = hasPicked \|\| hasActivePickAnywhere;/g, 'const isPickDisabled = !user || hasPicked || hasActivePickAnywhere;');

// 5. Update footer text
const oldFooterText = `                !isPickDisabled ? (
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">Select Team</span>
                ) : (
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
                )
             )}
          </div>`;

const newFooterText = `                !user ? (
                  <Link to="/login" className="text-xs font-bold text-zinc-500 uppercase tracking-wide hover:text-zinc-300">Sign Up / Sign In</Link>
                ) : !isPickDisabled ? (
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">Select Team</span>
                ) : (
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
                )
             )}
          </div>`;
code = code.replace(oldFooterText, newFooterText);

// 6. Update handleMakePick
code = code.replace(/const handleMakePick = async \(matchup: any, team: any\) => {\n    if \(!user \|\| !profile \|\| !chain\) return;/g,
`const handleMakePick = async (matchup: any, team: any) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    if (!profile || !chain) return;`);


fs.writeFileSync('src/App.tsx', code);
