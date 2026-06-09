import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/link4/Link4AdminPage.tsx', 'utf8');

const replacement = `  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);

  useEffect(() => {`;

content = content.replace(/  const \[isSyncing, setIsSyncing\] = useState\(false\);\n  const \[syncStatus, setSyncStatus\] = useState<string \| null>\(null\);\n\n  useEffect\(\(\) => \{/m, replacement);

const handlePayoutCode = `
  const handlePayout = async (segmentId: string) => {
    if (!confirm('Are you sure you want to payout this segment? This action cannot be undone.')) return;
    setPayoutLoading(segmentId);
    try {
      const response = await fetch('/api/admin/link4/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${await auth.currentUser?.getIdToken()}\`
        },
        body: JSON.stringify({ segmentId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payout failed');
      }
      alert('Payout successful!');
    } catch (e: any) {
      console.error('Payout error:', e);
      alert(e.message);
    } finally {
      setPayoutLoading(null);
    }
  };

  const handleSyncEligible = async () => {`;

content = content.replace(/  const handleSyncEligible = async \(\) => \{/m, handlePayoutCode);

const interfaceReplacement = `interface Link4Segment {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  allowedSports: string[];
  theme: Link4SegmentTheme;
  createdAt: number;
  updatedAt: number;
  payoutComplete?: boolean;
}`;

content = content.replace(/interface Link4Segment \{[\s\S]*?updatedAt: number;\n\}/m, interfaceReplacement);

const htmlReplacement = `                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {status.label === 'Completed' && !segment.payoutComplete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePayout(segment.id); }}
                          disabled={payoutLoading === segment.id}
                          className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                          title="Payout Segment"
                        >
                          {payoutLoading === segment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(segment); }}
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(segment.id); }}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>`;

content = content.replace(/                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">[\s\S]*?<\/div>/m, htmlReplacement);

content = `import { Save, Loader2, Calendar, Plus, Edit2, Trash2, Clock, PlayCircle, Link as LinkIcon, Palette, Image as ImageIcon, RefreshCw, Coins } from 'lucide-react';\n` + content.replace(/import { Save, Loader2, Calendar, Plus, Edit2, Trash2, Clock, PlayCircle, Link as LinkIcon, Palette, Image as ImageIcon, RefreshCw } from 'lucide-react';\n/m, '');

// Also import auth if not imported
if (!content.includes('import { auth } from ')) {
   content = content.replace("import { db } from '../../../lib/firebase';", "import { db, auth } from '../../../lib/firebase';");
}

fs.writeFileSync('src/pages/admin/link4/Link4AdminPage.tsx', content, 'utf8');
