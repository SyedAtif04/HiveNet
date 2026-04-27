import { useState } from 'react';
import FileUploader from './FileUploader';

export default function FloatingActions() {
  const [openUpload, setOpenUpload] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* BACKDROP (BEHIND EVERYTHING) */}
      {openUpload && (
        <div
          onClick={() => setOpenUpload(false)}
          className="fixed inset-0 bg-black/30 z-40"
        />
      )}

      {/* UPLOAD PANEL (ABOVE BACKDROP) */}
      {openUpload && (
        <div
          className="fixed bottom-24 right-6 w-72
                     bg-[#2f2d3a] border border-[#3a3847]
                     rounded-xl p-4 space-y-3 shadow-2xl z-50"
        >
          <FileUploader
            title="Upload Employees"
            endpoint="/api/upload/employees"
          />

          <FileUploader
            title="Upload Shift Requirements"
            endpoint="/api/upload/shifts"
          />
        </div>
      )}

      {/* FLOATING BUTTON */}
      <button
        onClick={() => setOpenUpload(!openUpload)}
        className="w-12 h-12 bg-[#E3AA0D] text-[#282631]
                   rounded-full shadow-lg font-bold text-lg
                   relative z-50"
      >
        ↑
      </button>

    </div>
  );
}