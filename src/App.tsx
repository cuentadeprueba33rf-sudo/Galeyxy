/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, X, Image as ImageIcon, Trash2, Maximize2, UploadCloud, Minimize2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';

interface Photo {
  id: string;
  url: string;
  name: string;
  size: string;
  date: number;
}

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Load photos from localStorage on mount
  useEffect(() => {
    const savedPhotos = localStorage.getItem('minimal-gallery-photos');
    if (savedPhotos) {
      try {
        setPhotos(JSON.parse(savedPhotos));
      } catch (e) {
        console.error('Failed to parse saved photos', e);
      }
    }
  }, []);

  // Save photos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('minimal-gallery-photos', JSON.stringify(photos));
  }, [photos]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      lightboxRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto: Photo = {
          id: Math.random().toString(36).substr(2, 9),
          url: e.target?.result as string,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: Date.now(),
        };
        setPhotos(prev => [newPhoto, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const deletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#1F1F1F] px-6 py-8 md:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light tracking-tight mb-2">Gallery</h1>
            <p className="text-sm text-[#A1A1A1] uppercase tracking-widest font-medium">
              {photos.length} {photos.length === 1 ? 'Photograph' : 'Photographs'}
            </p>
          </div>
          
          <label className="group relative cursor-pointer overflow-hidden bg-white text-black px-6 py-3 rounded-full transition-all hover:pr-12 active:scale-95">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Plus size={18} />
              Upload
            </span>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus size={18} />
            </div>
          </label>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:px-12">
        {/* Drop Zone / Empty State */}
        {photos.length === 0 ? (
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative h-[60vh] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all duration-500
              ${isDragging ? 'border-white bg-[#141414] scale-[0.99]' : 'border-[#1F1F1F] bg-transparent'}
            `}
          >
            <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
              <div className="w-20 h-20 bg-[#141414] rounded-full flex items-center justify-center text-[#A1A1A1]">
                <UploadCloud size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Start your collection</h3>
                <p className="text-[#A1A1A1] text-sm leading-relaxed">
                  Drag and drop your images here, or use the upload button to select files from your computer.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={photos} 
            onReorder={setPhotos}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {photos.map((photo) => (
                <Reorder.Item
                  key={photo.id}
                  value={photo}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="group relative aspect-[4/5] bg-[#141414] rounded-2xl overflow-hidden cursor-zoom-in active:cursor-grabbing"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img 
                    src={photo.url} 
                    alt={photo.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white/40 cursor-grab active:cursor-grabbing">
                        <GripVertical size={18} />
                      </div>
                      <button 
                        onClick={(e) => deletePhoto(photo.id, e)}
                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="text-white space-y-1">
                      <p className="text-sm font-medium truncate">{photo.name}</p>
                      <p className="text-xs opacity-60 uppercase tracking-wider">{photo.size}</p>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            ref={lightboxRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 transition-colors duration-500 ${isFullscreen ? 'bg-black' : 'bg-black/95 backdrop-blur-xl'}`}
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Controls */}
            <div className="absolute top-8 right-8 flex items-center gap-4 z-50">
              <button 
                className="w-12 h-12 flex items-center justify-center rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
              </button>
              <button 
                className="w-12 h-12 flex items-center justify-center rounded-full transition-colors text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setSelectedPhoto(null)}
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.name}
                className={`max-w-full transition-all duration-500 ${isFullscreen ? 'max-h-screen w-screen object-contain' : 'max-h-[80vh] object-contain shadow-2xl rounded-lg'}`}
                referrerPolicy="no-referrer"
              />
              
              {!isFullscreen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center space-y-2"
                >
                  <h2 className="text-2xl font-light text-white">{selectedPhoto.name}</h2>
                  <div className="flex items-center gap-4 text-xs text-[#A1A1A1] uppercase tracking-widest">
                    <span>{selectedPhoto.size}</span>
                    <span className="w-1 h-1 bg-[#1F1F1F] rounded-full"></span>
                    <span>{new Date(selectedPhoto.date).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 md:px-12 border-t border-[#1F1F1F] mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[#A1A1A1] uppercase tracking-widest">
          <p>© 2026 Minimalist Gallery</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
