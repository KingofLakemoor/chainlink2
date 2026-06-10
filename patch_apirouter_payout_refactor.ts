import fs from 'fs';

let content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const importReplacement = `import { gradeMatchups } from './services/grader.js';
import { gradeLink4Matchups, payoutLink4Segment } from './services/link4Grader.js';`;

content = content.replace("import { gradeMatchups } from './services/grader.js';\nimport { gradeLink4Matchups } from './services/link4Grader.js';", importReplacement);

const newEndpoint = `apiRouter.post("/admin/link4/payout", validateAdmin, async (req, res) => {
  try {
    const { segmentId } = req.body;
    await payoutLink4Segment(segmentId);
    res.json({ success: true });
  } catch (e: any) {
    console.error('Link4 payout error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});`;

content = content.replace(/apiRouter\.post\("\/admin\/link4\/payout"[\s\S]*?res\.status\(500\)\.json\(\{ success: false, error: e\.message \}\);\n  \}\n\}\);\n/m, newEndpoint + '\n');

fs.writeFileSync('src/apiRouter.ts', content, 'utf8');
