import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass } from 'lucide-react';

export default function PipelineOverlay() {
  const { isExecuting, pipelineProgress, pipelineStatus } = useAppStore();

  return (
    <AnimatePresence>
      {isExecuting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-[#121212]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8"
        >
          <div className="w-full max-w-md bg-[#1c1c1f] border border-[#2d2d30] p-6 rounded-2xl shadow-2xl space-y-6 text-center">
            
            <div className="flex justify-center text-sky-400 mb-2">
              <Hourglass className="w-12 h-12 animate-spin" style={{ animationDuration: '2s' }} />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span className="flex items-center text-left max-w-[80%] leading-tight">
                  {pipelineStatus}
                </span>
                <span className="text-sky-400 font-bold shrink-0">{pipelineProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#2a2a2d] rounded-full overflow-hidden border border-[#3f3f46]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${pipelineProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
