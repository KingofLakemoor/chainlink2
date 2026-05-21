const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. TopStats: render a "Sign in" link if !user
const topStatsRegex = /function TopStats\(\) \{\n  const \{ profile, chain \} = useAuth\(\);\n\n  return \(/;
code = code.replace(topStatsRegex,
`function TopStats() {
  const { user, profile, chain } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-2 md:gap-5">
        <Link to="/login" className="text-zinc-100 hover:text-zinc-300 font-medium">Sign in</Link>
      </div>
    );
  }

  return (`);

// 2. Sidebar: return null if !user
const sidebarRegex = /function Sidebar\(\{ open, setOpen \}: \{ open: boolean, setOpen: \(open: boolean\) => void \}\) \{\n  const \{ user, profile \} = useAuth\(\);\n  const location = useLocation\(\);\n/;
code = code.replace(sidebarRegex,
`function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const { user, profile } = useAuth();
  const location = useLocation();

  if (!user) return null;\n\n`);

// 3. MainLayout mobile header: modify it so it renders the menu button conditionally
const mainLayoutHeaderRegex = /<div className="flex items-center gap-3"><div className="pointer-events-auto"><TopStats \/><\/div><button className="p-2 -mr-2 text-zinc-400 md:hidden" onClick=\{\(\) => setSidebarOpen\(true\)\}>\n             <Menu className="w-6 h-6" \/>\n           <\/button><\/div>/;
const newHeader = `<div className="flex items-center gap-3"><div className="pointer-events-auto"><TopStats /></div>{user && <button className="p-2 -mr-2 text-zinc-400 md:hidden" onClick={() => setSidebarOpen(true)}>
             <Menu className="w-6 h-6" />
           </button>}</div>`;
code = code.replace(mainLayoutHeaderRegex, newHeader);

// Wait, the user instruction was:
// - Move the hamburger menu icon in the mobile header from the right side to the left side (next to the page title)
// - and style it to match the provided screenshot (border border-zinc-800 rounded-lg p-2).

fs.writeFileSync('src/App.tsx', code);
