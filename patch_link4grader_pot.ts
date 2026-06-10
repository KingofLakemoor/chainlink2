import fs from 'fs';

let content = fs.readFileSync('src/services/link4Grader.ts', 'utf8');

const replacement = `    const picksSnap = await transaction.get(adminDb.collection('link4Picks').where('segmentId', '==', segmentId));
    if (picksSnap.empty) {
       transaction.update(segmentRef, { payoutComplete: true, updatedAt: Date.now() });
       return; // no one played
    }

    const segmentCost = segmentDoc.data().cost ?? 10;
    const allPicks = picksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const totalPot = allPicks.length * segmentCost;
    const payoutAmount = Math.floor(totalPot * 0.60);`;

content = content.replace(/    const picksSnap = await transaction\.get\(adminDb\.collection\('link4Picks'\)\.where\('segmentId', '==', segmentId\)\);\n    if \(picksSnap\.empty\) \{[\s\S]*?const payoutAmount = Math\.floor\(totalPot \* 0\.60\);/m, replacement);

fs.writeFileSync('src/services/link4Grader.ts', content, 'utf8');
