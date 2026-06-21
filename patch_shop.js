import fs from 'fs';

const content = fs.readFileSync('src/pages/shop/ShopPage.tsx', 'utf8');

// 1. Add claimLoading state
let updatedContent = content.replace(
  'const [loading, setLoading] = useState(true);',
  'const [loading, setLoading] = useState(true);\n  const [claimLoading, setClaimLoading] = useState(false);'
);

// 2. Add handleClaimDaily method
const claimMethod = `
  const handleClaimDaily = async () => {
    if (!user) return;
    setClaimLoading(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shop/claim-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Successfully claimed 10 daily links!", type: 'success' });
      } else {
        setMessage({ text: data.error || "Failed to claim links.", type: 'error' });
      }
    } catch (e) {
      setMessage({ text: "An error occurred.", type: 'error' });
    } finally {
      setClaimLoading(false);
    }
  };
`;

updatedContent = updatedContent.replace(
  'const handleStripeCheckout = async (itemType: string, amount?: number) => {',
  claimMethod + '\n  const handleStripeCheckout = async (itemType: string, amount?: number) => {'
);


// 3. Update Pro section text
updatedContent = updatedContent.replace(
  '<li><strong>10 Links</strong> daily just for logging in</li>',
  '<li><strong>Claim 10 Links</strong> daily in the Shop</li>'
);

const todayStr = "new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })";

// 4. Update the Premium check section
const oldProBlock = `
            {profile?.premium ? (
              <div className="bg-gradient-to-b from-purple-900/40 to-[#121212] border border-purple-500/30 rounded-xl p-6 flex flex-col items-center text-center sm:col-span-2 lg:col-span-4 w-full">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 mx-auto">
                  <Crown className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-6">ChainLink Pro</h3>

                {proItems.length === 0 ? (
                  <div className="text-purple-300/60 p-4 border border-purple-500/20 rounded-lg w-full">
                    New Pro cosmetics coming soon!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
                    {proItems.map(item => renderCosmeticCard(item))}
                  </div>
                )}
              </div>
            ) : (`;

const newProBlock = `
            {profile?.premium ? (
              <div className="bg-gradient-to-b from-purple-900/40 to-[#121212] border border-purple-500/30 rounded-xl p-6 flex flex-col items-center text-center sm:col-span-2 lg:col-span-4 w-full">
                <div className="flex flex-col md:flex-row items-center justify-between w-full mb-6">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Crown className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bold text-white">ChainLink Pro</h3>
                      <p className="text-purple-300/70 text-sm">Thanks for being a Pro member!</p>
                    </div>
                  </div>
                  <div className="bg-[#121212]/80 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center w-full md:w-auto min-w-[200px]">
                    <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Daily Bonus</span>
                    <Button
                      onClick={handleClaimDaily}
                      disabled={claimLoading || profile?.lastDailyClaim === new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold"
                    >
                      {claimLoading ? 'Claiming...' : profile?.lastDailyClaim === new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }) ? 'Claimed Today' : 'Claim 10 Links'}
                    </Button>
                  </div>
                </div>

                <div className="w-full border-t border-purple-500/20 my-6"></div>

                <h4 className="text-lg font-bold text-white mb-4 self-start">Pro Exclusive Items</h4>
                {proItems.length === 0 ? (
                  <div className="text-purple-300/60 p-4 border border-purple-500/20 rounded-lg w-full">
                    New Pro cosmetics coming soon!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
                    {proItems.map(item => renderCosmeticCard(item))}
                  </div>
                )}
              </div>
            ) : (`;

updatedContent = updatedContent.replace(oldProBlock, newProBlock);


fs.writeFileSync('src/pages/shop/ShopPage.tsx', updatedContent);
console.log("Patched src/pages/shop/ShopPage.tsx");
