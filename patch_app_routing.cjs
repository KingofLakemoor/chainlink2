const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Landing: if (user) return <Navigate to="/play" replace />; -> <Navigate to="/" replace />
code = code.replace(/if \(user\) return <Navigate to="\/play" replace \/>;/g, 'if (user) return <Navigate to="/" replace />;');

// 2. PrivateRoute: return user ? <>{children}</> : <Navigate to="/" />; -> <Navigate to="/login" />
code = code.replace(/return user \? <>{children}<\/> : <Navigate to="\/" \/>;/g, 'return user ? <>{children}</> : <Navigate to="/login" />;');

// 3. MainLayout pageTitle:
code = code.replace(/'\/play': 'Play',/g, "'/': 'Play',");

// 4. Sidebar NavItem for Play ChainLink:
code = code.replace(/<NavItem icon=\{PlayCircle\} label="Play ChainLink" path="\/play" \/>/g, '<NavItem icon={PlayCircle} label="Play ChainLink" path="/" />');

// 5. App Routes:
code = code.replace(/<Route path="\/" element=\{<Landing \/>} \/>/g, '<Route path="/login" element={<Landing />} />\n          <Route path="/" element={<MainLayout><PlayDashboard /></MainLayout>} />');
code = code.replace(/<Route path="\/play" element=\{<PrivateRoute><MainLayout><PlayDashboard \/><\/MainLayout><\/PrivateRoute>} \/>\n/g, '');
code = code.replace(/<Route path="\*" element=\{<Navigate to="\/play" replace \/>} \/>/g, '<Route path="*" element={<Navigate to="/" replace />} />');

fs.writeFileSync('src/App.tsx', code);
