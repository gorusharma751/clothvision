import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}>
        <motion.div initial={{opacity:0, scale:0.92, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.92}}
          className={`w-full ${width} glass rounded-2xl overflow-hidden`}
          style={{border:'1px solid rgba(124,58,237,0.25)'}}>
          <div className="flex items-center justify-between p-5 border-b" style={{borderColor:'rgba(124,58,237,0.15)'}}>
            <h3 className="font-display font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-purple-400/60 hover:text-white transition-colors"><X size={18}/></button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
