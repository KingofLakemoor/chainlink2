import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Trophy, Copy, Check, Users, Target } from 'lucide-react';

export function SidebarProgress() {
  const { profile } = useAuth();
  const [prizeData, setPrizeData] = useState({
    activeUsersRequirement: 25,
    picksRequirement: 375,
    prizeDescription: '$5 Club 602 gift card',
    sponsorName: 'Club 602'
  });

  const [activeUsers, setActiveUsers] = useState(0);
  const [globalPicks, setGlobalPicks] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const docRef = doc(db, 'settings', 'monthlyPrize');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrizeData(docSnap.data() as any);
        }

        // Fetch active users (just an approximation: all users for now, or users created this month?)
        // The prompt says "25 users" - probably total users or we can just fetch all users and count them.
        const usersSnap = await getDocs(collection(db, 'users'));
        setActiveUsers(usersSnap.size);

        // Fetch global picks (all pickemPicks or bracketGamePredictions)
        // Let's just fetch pickemPicks for now
        const picksSnap = await getDocs(collection(db, 'pickemPicks'));
        setGlobalPicks(picksSnap.size);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleCopyReferral = () => {
    if (profile?.id) {
      const referralLink = `${window.location.origin}/login?ref=${profile.id}`;
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;

  const userProgress = Math.min(100, (activeUsers / (prizeData.activeUsersRequirement || 1)) * 100);
  const picksProgress = Math.min(100, (globalPicks / (prizeData.picksRequirement || 1)) * 100);

  return (
    <div className="mt-4 mb-4 px-3 space-y-4">
      <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-800/60">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold text-zinc-200">Monthly Prize</span>
        </div>
        <div className="text-sm text-[#22c55e] font-medium mb-1">
          {prizeData.prizeDescription}
        </div>
        <div className="text-xs text-zinc-400 mb-3">
          Sponsored by <span className="text-zinc-200">{prizeData.sponsorName}</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3"/> Users</span>
              <span className="text-zinc-300">{activeUsers} / {prizeData.activeUsersRequirement}</span>
            </div>
            <Progress value={userProgress} className="h-1.5" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
              <span className="text-zinc-300">{globalPicks} / {prizeData.picksRequirement}</span>
            </div>
            <Progress value={picksProgress} className="h-1.5" />
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyReferral}
        className="w-full text-xs h-8 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:text-white"
      >
        {copied ? (
          <><Check className="w-3 h-3 mr-1.5 text-green-500" /> Copied!</>
        ) : (
          <><Copy className="w-3 h-3 mr-1.5" /> Copy Referral Link</>
        )}
      </Button>
    </div>
  );
}
