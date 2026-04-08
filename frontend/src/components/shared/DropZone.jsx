import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image } from 'lucide-react';

export default function DropZone({ onFile, label, preview, accept = {'image/*':[]} }) {
  const onDrop = useCallback(files => { if (files[0]) onFile(files[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles: 1 });
  return (
    <div {...getRootProps()} className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-purple-400 bg-purple-500/10' : 'border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-500/5'}`}>
      <input {...getInputProps()} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-xl object-contain" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 rounded-xl transition-opacity" style={{background:'rgba(0,0,0,0.5)'}}>
            <p className="text-white text-sm font-semibold">Click to change</p>
          </div>
        </div>
      ) : (
        <div className="py-4">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{background:'rgba(124,58,237,0.1)'}}>
            {isDragActive ? <Upload size={22} className="text-purple-400" /> : <Image size={22} className="text-purple-400/60" />}
          </div>
          <p className="text-sm font-semibold text-purple-200/70">{isDragActive ? 'Drop it!' : label || 'Drop image here'}</p>
          <p className="text-xs text-purple-400/40 mt-1">or click to browse</p>
        </div>
      )}
    </div>
  );
}
