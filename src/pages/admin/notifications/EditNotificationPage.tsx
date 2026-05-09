import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function EditNotificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'notifications', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();

          let formattedDate = "";
          if (data.scheduledTime) {
              const date = new Date(data.scheduledTime);
              const tzOffset = date.getTimezoneOffset() * 60000;
              formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
          }

          setFormData({
            ...data,
            scheduledTimeStr: formattedDate
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotification();
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!id || !formData) return;
    if (!formData.title || !formData.body) {
      alert('Title and Body are required');
      return;
    }

    setSaving(true);
    try {
      const updateData = { ...formData };
      delete updateData.scheduledTimeStr;

      if (updateData.scheduledTimeStr) {
          updateData.scheduledTime = new Date(updateData.scheduledTimeStr).getTime();
      }
      if (updateData.audience === 'GLOBAL') {
          updateData.targetUserId = null;
      }

      await updateDoc(doc(db, 'notifications', id), updateData);
      alert('Notification updated successfully!');
      navigate('/admin/notifications');
    } catch (e) {
      console.error(e);
      alert('Failed to update notification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading notification...</div>;
  if (!formData) return <div className="p-8 text-zinc-500">Notification not found</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl max-w-3xl mx-auto">
      <div className="p-6 border-b border-zinc-800 bg-[#18181A] flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">Edit Notification</h2>
            <p className="text-zinc-400 text-sm">{formData.title}</p>
        </div>
        <Button onClick={() => navigate('/admin/notifications')} variant="outline">Cancel</Button>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title *</label>
                <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body *</label>
                <textarea
                    value={formData.body || ''}
                    onChange={(e) => handleChange('body', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 min-h-[100px]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Audience</label>
                  <select
                      value={formData.audience || 'GLOBAL'}
                      onChange={(e) => handleChange('audience', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="SPECIFIC_USER">SPECIFIC_USER</option>
                  </select>
              </div>

              {formData.audience === 'SPECIFIC_USER' && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Target User ID</label>
                    <input
                        type="text"
                        value={formData.targetUserId || ''}
                        onChange={(e) => handleChange('targetUserId', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</label>
                    <select
                        value={formData.status || 'PENDING'}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                        <option value="PENDING">PENDING</option>
                        <option value="SENT">SENT</option>
                        <option value="FAILED">FAILED</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Scheduled Time</label>
                    <input
                        type="datetime-local"
                        value={formData.scheduledTimeStr || ''}
                        onChange={(e) => handleChange('scheduledTimeStr', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                    />
                </div>
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <Button onClick={handleUpdate} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none min-w-[120px]">
              {saving ? 'Updating...' : 'Update'}
            </Button>
        </div>
      </div>
    </div>
  );
}
