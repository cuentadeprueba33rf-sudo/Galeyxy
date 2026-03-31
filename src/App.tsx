/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Trash2, Maximize2, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#FDFDFD]/80 backdrop-blur-md border-b border-gray-100 px-6 py-8 md:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light tracking-tight mb-2">Gallery</h1>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-medium">
              {photos.length} {photos.length === 1 ? 'Photograph' : 'Photographs'}
            </p>
          </div>
          
          <label className="group relative cursor-pointer overflow-hidden bg-black text-white px-6 py-3 rounded-full transition-all hover:pr-12 active:scale-95">
            <span className="flex items-center gap-2 text-sm font-medium">
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
              ${isDragging ? 'border-black bg-gray-50 scale-[0.99]' : 'border-gray-200 bg-transparent'}
            `}
          >
            <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                <UploadCloud size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">Start your collection</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Drag and drop your images here, or use the upload button to select files from your computer.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="group relative aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden cursor-zoom-in"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img 
                    src={photo.url} 
                    alt={photo.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6">
                    <div className="flex justify-end">
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex items-center justify-center p-6 md:p-12"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={24} />
            </button>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.name}
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
                referrerPolicy="no-referrer"
              />
              
              <div className="mt-8 text-center space-y-2">
                <h2 className="text-2xl font-light">{selectedPhoto.name}</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400 uppercase tracking-widest">
                  <span>{selectedPhoto.size}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span>{new Date(selectedPhoto.date).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 md:px-12 border-t border-gray-100 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-400 uppercase tracking-widest">
          <p>© 2026 Minimalist Gallery</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
