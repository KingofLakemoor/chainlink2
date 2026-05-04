import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ShopPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 font-display flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-[#22c55e]" />
          Link Store
        </h1>
        <p className="text-zinc-400 mt-1">Spend your links on cosmetics, merch, and gift cards.</p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Cosmetics</h2>
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            Cosmetics items coming soon...
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Merch</h2>
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            Merch items coming soon...
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Gift Cards</h2>
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            Gift Cards coming soon...
          </div>
        </section>
      </div>
    </div>
  );
}
