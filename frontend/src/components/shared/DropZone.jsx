import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';

export default function DropZone({ onFile, onRemove, label, preview, accept={'image/*':[]}, sublabel }) {
  const onDrop = useCallback(files => { if (files[0]) onFile(files[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles:1 });
  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive?'active':''} ${preview?'has-file':''}`} style={{minHeight:120}}>
      <input {...getInputProps()}/>
      {preview ? (
        <div className="relative" style={{padding:8}}>
          <img src={preview} alt="preview" style={{width:'100%',maxHeight:160,objectFit:'contain',borderRadius:8}}/>
          {onRemove && (
            <button type="button" onClick={e=>{e.stopPropagation();onRemove();}}
              style={{position:'absolute',top:4,right:4,background:'rgba(239,68,68,.8)',border:'none',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff'}}>
              <X size={12}/>
            </button>
          )}
          <p style={{textAlign:'center',fontSize:11,color:'rgba(162,140,250,.5)',marginTop:4}}>Click to change</p>
        </div>
      ) : (
        <div style={{padding:'20px 12px',textAlign:'center'}}>
          <div style={{width:40,height:40,borderRadius:12,background:'rgba(124,58,237,.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
            {isDragActive ? <Upload size={18} color="#a78bfa"/> : <Image size={18} color="rgba(124,58,237,.5)"/>}
          </div>
          <p style={{fontSize:13,fontWeight:600,color:'rgba(226,226,240,.6)'}}>{isDragActive?'Drop here!':(label||'Drop or click')}</p>
          {sublabel && <p style={{fontSize:11,color:'rgba(124,58,237,.4)',marginTop:3}}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}
