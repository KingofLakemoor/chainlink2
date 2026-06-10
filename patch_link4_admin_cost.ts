import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/link4/Link4AdminPage.tsx', 'utf8');

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
  cost: number;
}`;

content = content.replace(/interface Link4Segment \{[\s\S]*?payoutComplete\?: boolean;\n\}/m, interfaceReplacement);

const stateReplacement = `  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [cost, setCost] = useState(10);
  const [theme, setTheme] = useState<Link4SegmentTheme>({`;

content = content.replace(/  const \[name, setName\] = useState\(''\);\n  const \[startTime, setStartTime\] = useState\(''\);\n  const \[endTime, setEndTime\] = useState\(''\);\n  const \[selectedSports, setSelectedSports\] = useState<string\[\]>\(\[\]\);\n  const \[theme, setTheme\] = useState<Link4SegmentTheme>\(\{/m, stateReplacement);

const resetReplacement = `    setCost(10);
    setTheme({`;

content = content.replace(/    setSelectedSports\(\[\]\);\n    setTheme\(\{/m, "    setSelectedSports([]);\n" + resetReplacement);

const editReplacement = `    setEndTime(segment.endTime);
    setSelectedSports(segment.allowedSports || []);
    setCost(segment.cost ?? 10);
    setTheme(segment.theme || {`;

content = content.replace(/    setEndTime\(segment\.endTime\);\n    setSelectedSports\(segment\.allowedSports \|\| \[\]\);\n    setTheme\(segment\.theme \|\| \{/m, editReplacement);

const saveReplacement = `      const payload: Partial<Link4Segment> = {
        name,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        allowedSports: selectedSports,
        theme,
        cost,
        updatedAt: Date.now()
      };`;

content = content.replace(/      const payload: Partial<Link4Segment> = \{[\s\S]*?updatedAt: Date\.now\(\)\n      \};/m, saveReplacement);

const formHtml = `              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-zinc-400 mb-1">Buy-in Cost (Links)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition-colors"
                  min="0"
                />
              </div>

              {/* Theme Settings */}`;

content = content.replace(/              \{\/\* Theme Settings \*\/\}/m, formHtml);

const cardHtml = `                  <p className="text-zinc-400 flex items-center gap-1 mt-1 text-sm"><Coins className="w-3 h-3"/> Cost: {segment.cost ?? 10} links</p>
                </div>
                <div className="flex items-center gap-4">`;

content = content.replace(/                <\/div>\n                <div className="flex items-center gap-4">/m, cardHtml);


fs.writeFileSync('src/pages/admin/link4/Link4AdminPage.tsx', content, 'utf8');
