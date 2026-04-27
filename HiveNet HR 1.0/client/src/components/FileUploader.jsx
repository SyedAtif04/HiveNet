import { useState } from 'react';

export default function FileUploader({ type, endpoint, title }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setMsg(`✅ ${title} uploaded successfully`);
      setFile(null);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2f2d3a] border border-[#3a3847] p-4 rounded-xl space-y-3">

      <h3 className="text-[#E3AA0D] font-semibold">{title}</h3>

      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files[0])}
        className="text-sm text-gray-300"
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="bg-[#E3AA0D] text-[#282631] px-3 py-1 rounded-lg text-sm font-semibold"
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      {msg && <p className="text-xs text-gray-300">{msg}</p>}
    </div>
  );
}