const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const mainLayoutRegex = /function MainLayout\(\{ children \}: \{ children: React\.ReactNode \}\) \{\n  const location = useLocation\(\);\n  useNotifications\(\);\n  const \[sidebarOpen, setSidebarOpen\] = useState\(false\);/;

const mainLayoutReplacement = `function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);`;

code = code.replace(mainLayoutRegex, mainLayoutReplacement);

const mobileHeaderRegex = /<div className="md:hidden h-16 border-b border-\[#27272a\] bg-\[#121212\]\/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">\n           <div className="flex items-center gap-2">\n             <Link2 className="w-6 h-6 text-\[#22c55e\]" \/>\n             <span className="font-bold text-lg font-display text-zinc-100">\{pageTitle\}<\/span>\n           <\/div>\n           <div className="flex items-center gap-3"><div className="pointer-events-auto"><TopStats \/><\/div>\{user && <button className="p-2 -mr-2 text-zinc-400 md:hidden" onClick=\{\(\) => setSidebarOpen\(true\)\}>\n             <Menu className="w-6 h-6" \/>\n           <\/button>\}<\/div>\n         <\/div>/;

const newMobileHeader = `<div className="md:hidden h-16 border-b border-[#27272a] bg-[#121212]/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
           <div className="flex items-center gap-2">
             {user && (
               <button className="p-2 text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 mr-1" onClick={() => setSidebarOpen(true)}>
                 <Menu className="w-5 h-5" />
               </button>
             )}
             {!user && <Link2 className="w-6 h-6 text-[#22c55e]" />}
             <span className="font-bold text-lg font-display text-zinc-100">{pageTitle}</span>
           </div>
           <div className="flex items-center gap-3"><div className="pointer-events-auto"><TopStats /></div></div>
         </div>`;

code = code.replace(mobileHeaderRegex, newMobileHeader);

fs.writeFileSync('src/App.tsx', code);
