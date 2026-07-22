'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const HOSTEL_TYPES = [
  'Two Sharing A/C with attached bathroom',
  'Two Sharing Non A/C with attached bathroom',
  'Four Sharing Non A/C Common Bathroom'
];

export default function AdminSettingsPage() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    fetchImages();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.tutorial_video_url) {
          setTutorialVideoUrl(data.tutorial_video_url);
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/hostel-images');
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
      }
    } catch (error) {
      console.error('Failed to fetch hostel images', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingType(type);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('hostel_type', type);

    try {
      const res = await fetch('/api/admin/hostel-images', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchImages();
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error(error);
      alert('Upload failed');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const res = await fetch(`/api/admin/hostel-images/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchImages();
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error(error);
      alert('Delete failed');
    }
  };

  const handleSaveTutorialUrl = async () => {
    try {
      setSavingUrl(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorial_video_url: tutorialVideoUrl })
      });
      if (res.ok) {
        alert('Tutorial Video URL saved successfully!');
      } else {
        alert('Failed to save URL.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-[#18281e] tracking-tight">Admin Settings</h1>
          <Link href="/admin" className="text-sm font-bold text-[#3b8a53] hover:underline">Back to Dashboard</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#e5e2e1] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] bg-[#f8f6f4]">
            <h2 className="text-lg font-bold text-[#18281e] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#3b8a53]">apartment</span>
              Hostel Images Management
            </h2>
            <p className="text-sm text-[#737873] mt-1 font-semibold">Upload images for each hostel type. These images will be shown to students before they confirm their choice.</p>
          </div>

          <div className="p-6 space-y-12">
            {loading ? (
              <p className="text-sm text-gray-500 font-semibold text-center py-10">Loading images...</p>
            ) : (
              HOSTEL_TYPES.map(type => {
                const typeImages = images.filter(img => img.hostel_type === type);
                
                return (
                  <div key={type} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-bold text-[#18281e] uppercase tracking-wider">{type}</h3>
                      <label className="relative cursor-pointer px-4 py-2 bg-[#18281e] hover:bg-[#2d4a35] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        {uploadingType === type ? 'Uploading...' : 'Upload Image'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleUpload(e, type)} 
                          disabled={uploadingType === type}
                        />
                      </label>
                    </div>

                    {typeImages.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-[#e5e2e1] rounded-xl flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-[32px] text-[#a0a5a0] mb-2">image_not_supported</span>
                        <p className="text-sm font-bold text-[#737873]">No images uploaded yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {typeImages.map(img => (
                          <div key={img.id} className="relative group rounded-xl overflow-hidden border border-[#e5e2e1] shadow-sm aspect-video bg-gray-100">
                            <img src={`/uploads/${img.file_key}`} alt={img.file_name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => handleDelete(img.id)}
                                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#e5e2e1] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] bg-[#f8f6f4]">
            <h2 className="text-lg font-bold text-[#18281e] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#eab308]">smart_display</span>
              Tutorial Guide Settings
            </h2>
            <p className="text-sm text-[#737873] mt-1 font-semibold">Provide a YouTube Video URL for the student tutorial guide.</p>
          </div>
          <div className="p-6 flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-[#18281e]">YouTube Video URL</label>
              <input 
                type="text" 
                value={tutorialVideoUrl}
                onChange={(e) => setTutorialVideoUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl border border-[#e5e2e1] bg-white outline-none focus:ring-2 focus:ring-[#3b8a53]/20 focus:border-[#3b8a53] transition-all text-sm font-semibold"
              />
            </div>
            <button 
              onClick={handleSaveTutorialUrl}
              disabled={savingUrl}
              className="px-6 py-3 bg-[#18281e] hover:bg-[#2d4a35] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {savingUrl ? 'Saving...' : 'Save URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
