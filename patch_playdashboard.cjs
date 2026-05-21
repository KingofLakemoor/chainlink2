const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. In PlayDashboard, remove `if (!user) return;` at the beginning of useEffect
code = code.replace(/useEffect\(\(\) => \{\n    if \(!user\) return;\n/g, 'useEffect(() => {\n');

// 2. Wrap the picks listener in `if (user)`
// Old code:
//    const setupPicksListeners = () => {
//      const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
//      ...
//      unsubPicks = onSnapshot(q, ...
// Replace it:
const oldSetupPicks = `    const setupPicksListeners = () => {
      const q = query(collection(db, 'picks'), where('userId', '==', user.uid));`;
const newSetupPicks = `    const setupPicksListeners = () => {
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
      }`;
// We need to carefully replace the user.uid logic or just use regex block replacement
