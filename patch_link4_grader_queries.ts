import fs from 'fs';

let content = fs.readFileSync('src/services/link4Grader.ts', 'utf8');

// Fix 1: Grade all active segments. Instead of relying on payoutComplete, grade any segment where endTime is in the future.
// However, segments that have ended might still need a final grading before payout.
// So, query all segments that are not in the past by too much, or simply query all segments and grade them.
// Let's grade segments where endTime >= now (active ones) OR we can just grade all segments that haven't been paid out.
// Wait, if payoutComplete is missing, '!=' true fails.
// We can query all segments, and then filter in memory for !payoutComplete.

content = content.replace(
  "const activeSegmentsSnap = await segmentsRef.where('payoutComplete', '!=', true).get();",
  "const activeSegmentsSnap = await segmentsRef.get();\n  const activeSegmentsDocs = activeSegmentsSnap.docs.filter(d => !d.data().payoutComplete);"
);

content = content.replace(
  "for (const segmentDoc of activeSegmentsSnap.docs) {",
  "for (const segmentDoc of activeSegmentsDocs) {"
);

// Fix 2: Payout cron query
const oldPayoutQuery = `  const segmentsSnap = await adminDb.collection('link4Segments')
    .where('payoutComplete', '!=', true)
    .where('endTime', '<=', now)
    .get();

  if (segmentsSnap.empty) return;

  console.log(\`[Link4Grader] Found \${segmentsSnap.size} completed segments to payout.\`);

  for (const segmentDoc of segmentsSnap.docs) {`;

const newPayoutQuery = `  const segmentsSnap = await adminDb.collection('link4Segments')
    .where('endTime', '<=', now)
    .get();

  if (segmentsSnap.empty) return;

  const segmentsToPayout = segmentsSnap.docs.filter(d => !d.data().payoutComplete);

  if (segmentsToPayout.length === 0) return;

  console.log(\`[Link4Grader] Found \${segmentsToPayout.length} completed segments to payout.\`);

  for (const segmentDoc of segmentsToPayout) {`;

content = content.replace(oldPayoutQuery, newPayoutQuery);

fs.writeFileSync('src/services/link4Grader.ts', content, 'utf8');
