import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

export default function ShopItemsListPage() {
  const navigate = useNavigate();
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'shopItems'));
      setShopItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to archive/delete this shop item?")) return;
    await deleteDoc(doc(db, 'shopItems', id));
    fetchData();
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading shop items...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">Shop Items ({shopItems.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {shopItems.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">For Sale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[...shopItems].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => navigate(`/admin/shopItems/edit/${item.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{item.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.type}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.cost || 0}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.forSale ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
