/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, X, Image as ImageIcon, Trash2, Maximize2, UploadCloud, Minimize2, GripVertical, Check, Edit2, Lock, Unlock, ShieldAlert, Shield, Settings, Fingerprint, Menu, RotateCcw, Search } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';

interface Photo {
  id: string;
  url: string;
  name: string;
  caption?: string;
  tags?: string[];
  size: string;
  date: number;
  isLocked?: boolean;
}

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [galleryPassword, setGalleryPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<{ type: 'set' | 'unlock', photoId?: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  const lightboxRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Load photos and password from localStorage on mount
  useEffect(() => {
    const savedPhotos = localStorage.getItem('minimal-gallery-photos');
    const savedPassword = localStorage.getItem('minimal-gallery-password');
    const savedBiometrics = localStorage.getItem('minimal-gallery-biometrics');
    
    if (savedPhotos) {
      try {
        setPhotos(JSON.parse(savedPhotos));
      } catch (e) {
        console.error('Failed to parse saved photos', e);
      }
    }
    if (savedPassword) {
      setGalleryPassword(savedPassword);
    }
    if (savedBiometrics === 'true') {
      setIsBiometricsEnabled(true);
    }

    // Check if in iframe
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // Check if biometrics are supported
    if (window.PublicKeyCredential) {
      try {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
          setIsBiometricsSupported(available);
        }).catch(err => {
          console.warn('Biometric support check failed:', err);
          setIsBiometricsSupported(false);
        });
      } catch (e) {
        console.warn('Biometric API access denied:', e);
        setIsBiometricsSupported(false);
      }
    } else {
      setIsBiometricsSupported(false);
    }
  }, []);

  // Save photos and password to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('minimal-gallery-photos', JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    if (galleryPassword) {
      localStorage.setItem('minimal-gallery-password', galleryPassword);
    }
  }, [galleryPassword]);

  useEffect(() => {
    localStorage.setItem('minimal-gallery-biometrics', isBiometricsEnabled.toString());
  }, [isBiometricsEnabled]);

  const bufferToBase64 = (buffer: ArrayBuffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  };

  const base64ToBuffer = (base64: string) => {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle panic mode keyboard shortcut (Esc or P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        setIsPanicMode(prev => !prev);
      }
      if (e.key === 'Escape' && isPanicMode) {
        setIsPanicMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanicMode]);

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
          caption: '',
          tags: [],
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: Date.now(),
          isLocked: false,
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

  const updatePhoto = (id: string, updates: Partial<Photo>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const resetEverything = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todo y restablecer la web? Esta acción no se puede deshacer.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const filteredPhotos = photos.filter(photo => {
    const query = searchQuery.toLowerCase();
    return (
      photo.name.toLowerCase().includes(query) ||
      (photo.caption && photo.caption.toLowerCase().includes(query)) ||
      (photo.tags && photo.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  const toggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!galleryPassword) {
      setShowPasswordModal({ type: 'set', photoId: id });
      return;
    }
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, isLocked: !p.isLocked } : p));
  };

  const handlePhotoClick = (photo: Photo) => {
    if (isEditMode) return;
    if (photo.isLocked) {
      setShowPasswordModal({ type: 'unlock', photoId: photo.id });
    } else {
      setSelectedPhoto(photo);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showPasswordModal?.type === 'set') {
      if (passwordInput.length < 4) {
        setPasswordError(true);
        return;
      }
      setGalleryPassword(passwordInput);
      if (showPasswordModal.photoId) {
        setPhotos(prev => prev.map(p => p.id === showPasswordModal.photoId ? { ...p, isLocked: true } : p));
      }
      setShowPasswordModal(null);
      setPasswordInput('');
      setPasswordError(false);
    } else if (showPasswordModal?.type === 'unlock') {
      if (passwordInput === galleryPassword) {
        const photo = photos.find(p => p.id === showPasswordModal.photoId);
        if (photo) setSelectedPhoto(photo);
        setShowPasswordModal(null);
        setPasswordInput('');
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    }
  };

  const handleBiometricAuth = async () => {
    if (!isBiometricsSupported) return;

    setIsScanning(true);
    if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]);

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const savedCredId = localStorage.getItem('minimal-gallery-cred-id');
      
      const options: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: savedCredId ? [{
            id: base64ToBuffer(savedCredId),
            type: 'public-key'
          }] : []
        }
      };
      
      const credential = await navigator.credentials.get(options) as PublicKeyCredential;
      
      if (credential && showPasswordModal?.photoId) {
        const photo = photos.find(p => p.id === showPasswordModal.photoId);
        if (photo) setSelectedPhoto(photo);
        setShowPasswordModal(null);
        setPasswordInput('');
        setPasswordError(false);
        if ('vibrate' in navigator) navigator.vibrate(50);
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Biometric authentication failed:', err);
      setIsScanning(false);
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        if (isInIframe) {
          alert("La autenticación biométrica real está restringida en esta ventana de vista previa. Por favor, abre la aplicación en una PESTAÑA NUEVA para usar tu huella.");
        } else {
          alert("Error de autenticación: Asegúrate de haber configurado tu huella correctamente.");
        }
      }
    }
  };

  const setupBiometrics = async () => {
    if (isInIframe) {
      alert("La configuración de biometría real requiere una conexión segura y no puede realizarse dentro de un iframe. Por favor, abre la aplicación en una PESTAÑA NUEVA.");
      return;
    }

    if (!isBiometricsSupported) {
      alert("Tu dispositivo o navegador no parece soportar autenticación biométrica de plataforma.");
      return;
    }
    
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: "Minimalist Gallery" },
          user: {
            id: new Uint8Array(16),
            name: "user@gallery",
            displayName: "Gallery User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000
        }
      };

      const credential = await navigator.credentials.create(options) as PublicKeyCredential;
      if (credential) {
        setIsBiometricsEnabled(true);
        localStorage.setItem('minimal-gallery-biometrics', 'true');
        localStorage.setItem('minimal-gallery-cred-id', bufferToBase64(credential.rawId));
        alert("¡Huella digital configurada con éxito!");
      }
    } catch (err: any) {
      console.error('Biometric setup failed:', err);
      alert("No se pudo configurar la huella digital. Asegúrate de que tu dispositivo tenga biometría configurada.");
    }
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

  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setIsEditMode(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 600);
  }, []);

  const stopLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans selection:bg-white selection:text-black transition-all duration-700 ${isPanicMode ? 'blur-[80px] pointer-events-none scale-110' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#1F1F1F] px-6 py-8 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex items-end gap-4">
            <div>
              <h1 className="text-4xl font-light tracking-tight mb-2">Gallery</h1>
              <p className="text-sm text-[#A1A1A1] uppercase tracking-widest font-medium">
                {photos.length} {photos.length === 1 ? 'Photograph' : 'Photographs'}
              </p>
            </div>
            <button 
              onClick={() => setIsPanicMode(true)}
              className="mb-2 p-2 text-red-500/50 hover:text-red-500 transition-colors"
              title="Panic Mode (P)"
            >
              <ShieldAlert size={20} />
            </button>
          </div>

          <div className="flex-1 max-w-md w-full">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1A1] group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, caption or tags..."
                className="w-full bg-[#1F1F1F] border border-transparent focus:border-white/20 rounded-full py-3 pl-12 pr-6 text-sm outline-none transition-all placeholder:text-[#444]"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1A1] hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-[#1F1F1F] text-white hover:bg-[#2A2A2A] rounded-full transition-all active:scale-95"
              title="Menu"
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 ${isEditMode ? 'bg-white text-black' : 'bg-[#1F1F1F] text-white hover:bg-[#2A2A2A]'}`}
            >
              {isEditMode ? <><Check size={18} /> Done</> : <><Edit2 size={18} /> Edit</>}
            </button>

            <label className="flex-1 md:flex-none group relative cursor-pointer overflow-hidden bg-white text-black px-6 py-3 rounded-full transition-all hover:pr-12 active:scale-95">
              <span className="flex items-center justify-center gap-2 text-sm font-semibold">
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
        ) : filteredPhotos.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-[#141414] rounded-full flex items-center justify-center text-[#A1A1A1]">
              <Search size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-medium">No matches found</h3>
              <p className="text-[#A1A1A1] text-sm">
                Try adjusting your search query to find what you're looking for.
              </p>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-white text-sm font-semibold underline underline-offset-4 hover:text-[#A1A1A1] transition-colors"
              >
                Clear search
              </button>
            </div>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={filteredPhotos} 
            onReorder={setPhotos}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredPhotos.map((photo) => (
                <Reorder.Item
                  key={photo.id}
                  value={photo}
                  drag={isEditMode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    rotate: isEditMode ? [0, -0.5, 0.5, 0] : 0,
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.23, 1, 0.32, 1],
                    rotate: {
                      repeat: Infinity,
                      duration: 0.2,
                      ease: "linear"
                    }
                  }}
                  className={`group relative aspect-[4/5] bg-[#141414] rounded-2xl overflow-hidden transition-all duration-300 ${isEditMode ? 'ring-2 ring-white/20 scale-95 cursor-grabbing' : 'cursor-zoom-in'}`}
                  onMouseDown={startLongPress}
                  onMouseUp={stopLongPress}
                  onMouseLeave={stopLongPress}
                  onTouchStart={startLongPress}
                  onTouchEnd={stopLongPress}
                  onClick={() => handlePhotoClick(photo)}
                >
                  {photo.isLocked ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1A1A] text-[#333] transition-colors group-hover:bg-[#222]">
                      <Lock size={48} strokeWidth={1} />
                      <p className="mt-4 text-[10px] uppercase tracking-[0.2em] opacity-40">Locked Content</p>
                    </div>
                  ) : (
                    <img 
                      src={photo.url} 
                      alt={photo.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Info Overlay */}
                  {!isEditMode && !photo.isLocked && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white truncate">{photo.name}</p>
                        {photo.caption && (
                          <p className="text-[10px] text-white/60 line-clamp-1">{photo.caption}</p>
                        )}
                        {photo.tags && photo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {photo.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-[8px] uppercase tracking-wider text-white/80">
                                {tag}
                              </span>
                            ))}
                            {photo.tags.length > 3 && (
                              <span className="text-[8px] text-white/40">+{photo.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 flex flex-col justify-between p-6 ${isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white/40 ${isEditMode ? 'opacity-100' : 'opacity-0'}`}>
                        <GripVertical size={18} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => toggleLock(photo.id, e)}
                          className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-colors ${photo.isLocked ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {photo.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(photo.id, e);
                          }}
                          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-white space-y-1">
                      <p className="text-sm font-medium truncate">{photo.isLocked ? '••••••••' : photo.name}</p>
                      <p className="text-xs opacity-60 uppercase tracking-wider">{photo.size}</p>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </main>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#111] border border-[#222] p-8 rounded-3xl max-w-sm w-full space-y-8 text-center"
            >
              <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto text-white">
                {showPasswordModal.type === 'set' ? <Shield size={32} /> : <Lock size={32} />}
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-medium">
                  {showPasswordModal.type === 'set' ? 'Set Gallery Password' : 'Locked Content'}
                </h2>
                <p className="text-sm text-[#A1A1A1]">
                  {showPasswordModal.type === 'set' 
                    ? 'Create a password to protect your private photos.' 
                    : 'Enter your password to view this photo.'}
                </p>
              </div>

              {showPasswordModal.type === 'unlock' && isBiometricsEnabled && (
                <div className="space-y-4">
                  <button 
                    onClick={handleBiometricAuth}
                    disabled={isScanning}
                    className={`w-full flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden ${isScanning ? 'cursor-wait' : ''}`}
                  >
                    <div className="relative">
                      <Fingerprint className={`text-white transition-all relative z-10 ${isScanning ? 'scale-125 text-cyan-400' : 'group-hover:scale-110'}`} size={48} />
                      {isScanning && (
                        <motion.div 
                          initial={{ top: '0%' }}
                          animate={{ top: '100%' }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-20"
                        />
                      )}
                      {isScanning && (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute inset-0 bg-cyan-500/20 rounded-full z-0"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium block">
                        {isScanning ? 'Escaneando...' : 'Usar Huella Digital'}
                      </span>
                      <span className="text-[10px] text-[#A1A1A1] uppercase tracking-widest">
                        {isScanning ? 'Verificando identidad' : 'Toca para escanear'}
                      </span>
                    </div>
                    
                    {/* Decorative scanning lines */}
                    <div className={`absolute inset-0 opacity-10 pointer-events-none transition-opacity ${isScanning ? 'opacity-30' : ''}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-[#222]" />
                    <span className="text-[10px] text-[#444] uppercase tracking-widest font-bold">o usa tu clave</span>
                    <div className="h-px flex-1 bg-[#222]" />
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input 
                  autoFocus
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className={`w-full bg-[#1A1A1A] border ${passwordError ? 'border-red-500' : 'border-[#222]'} rounded-xl px-4 py-3 text-center focus:outline-none focus:border-white transition-colors`}
                />
                {passwordError && (
                  <p className="text-xs text-red-500">
                    {showPasswordModal.type === 'set' ? 'Password must be at least 4 characters.' : 'Incorrect password. Try again.'}
                  </p>
                )}

                {showPasswordModal.type === 'set' && (isBiometricsSupported || isInIframe) && (
                  <div className="space-y-4">
                    <div className={`flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#222] ${isInIframe ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Fingerprint size={20} className="text-[#A1A1A1]" />
                        <span className="text-sm">Activar Huella Digital</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setupBiometrics()}
                        className={`w-10 h-5 rounded-full transition-colors relative ${isBiometricsEnabled ? 'bg-white' : 'bg-[#333]'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isBiometricsEnabled ? 'right-1 bg-black' : 'left-1 bg-[#A1A1A1]'}`} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] text-[#A1A1A1] leading-relaxed">
                        {isInIframe ? (
                          <span className="text-amber-400 font-medium flex flex-col gap-2">
                            <span className="flex items-center gap-1.5"><ShieldAlert size={12} /> Restricción de Seguridad</span>
                            La biometría real requiere una conexión segura de nivel superior. Abre la app en una pestaña nueva para configurar tu huella.
                          </span>
                        ) : (
                          "Nota: La seguridad biométrica real utiliza el hardware de tu dispositivo para proteger tus fotos."
                        )}
                      </p>
                      {isInIframe && (
                        <button
                          type="button"
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 text-white"
                        >
                          Abrir en Pestaña Nueva
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(null);
                      setPasswordInput('');
                      setPasswordError(false);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#1A1A1A] text-sm font-medium hover:bg-[#222] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    {showPasswordModal.type === 'set' ? 'Set Password' : 'Unlock'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panic Mode Instruction (only visible briefly when activated) */}
      <AnimatePresence>
        {isPanicMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto"
            onClick={() => setIsPanicMode(false)}
          >
            <p className="text-white/20 text-sm uppercase tracking-[0.5em] animate-pulse">Click to restore</p>
          </motion.div>
        )}
      </AnimatePresence>

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
                  className="mt-8 text-center space-y-6 max-w-xl w-full"
                >
                  <div className="space-y-2">
                    <input 
                      type="text"
                      value={selectedPhoto.name}
                      onChange={(e) => updatePhoto(selectedPhoto.id, { name: e.target.value })}
                      className="w-full bg-transparent text-2xl font-light text-white text-center focus:outline-none border-b border-transparent focus:border-white/20 pb-1"
                      placeholder="Photo Name"
                    />
                    <div className="flex items-center justify-center gap-4 text-xs text-[#A1A1A1] uppercase tracking-widest">
                      <span>{selectedPhoto.size}</span>
                      <span className="w-1 h-1 bg-[#1F1F1F] rounded-full"></span>
                      <span>{new Date(selectedPhoto.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea 
                      value={selectedPhoto.caption || ''}
                      onChange={(e) => updatePhoto(selectedPhoto.id, { caption: e.target.value })}
                      placeholder="Add a caption..."
                      className="w-full bg-[#1A1A1A] border border-[#222] rounded-xl p-4 text-sm text-[#A1A1A1] focus:outline-none focus:border-white/20 resize-none h-24 text-center"
                    />

                    <div className="space-y-2">
                      <div className="flex flex-wrap justify-center gap-2">
                        {selectedPhoto.tags?.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest flex items-center gap-2"
                          >
                            {tag}
                            <button 
                              onClick={() => {
                                const newTags = selectedPhoto.tags?.filter((_, i) => i !== index);
                                updatePhoto(selectedPhoto.id, { tags: newTags });
                              }}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input 
                        type="text"
                        placeholder="Add tags (press Enter)..."
                        className="w-full bg-transparent text-[10px] uppercase tracking-[0.2em] text-center focus:outline-none placeholder:text-[#333]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget;
                            const tag = input.value.trim();
                            if (tag && !selectedPhoto.tags?.includes(tag)) {
                              updatePhoto(selectedPhoto.id, { tags: [...(selectedPhoto.tags || []), tag] });
                              input.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 z-[120] bg-[#0F0F0F] border-r border-white/5 p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-2xl font-light tracking-tight">Menú</h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                <button 
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsBottomPanelOpen(true);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Trash2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Restablecer</p>
                    <p className="text-[10px] text-[#A1A1A1] uppercase tracking-widest">Opciones de limpieza</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setShowPasswordModal({ type: 'set' });
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Settings size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Seguridad</p>
                    <p className="text-[10px] text-[#A1A1A1] uppercase tracking-widest">Configurar contraseña</p>
                  </div>
                </button>
              </nav>

              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] text-[#444] uppercase tracking-[0.2em] font-bold text-center">
                  Minimalist Gallery v2.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Panel */}
      <AnimatePresence>
        {isBottomPanelOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBottomPanelOpen(false)}
              className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[140] bg-[#141414] border-t border-white/10 p-8 rounded-t-[40px] max-w-2xl mx-auto shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                  <RotateCcw size={32} className="text-red-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-light tracking-tight">Restablecer Aplicación</h3>
                  <p className="text-sm text-[#A1A1A1] max-w-xs mx-auto">
                    Esta acción eliminará permanentemente todas tus fotos, contraseñas y configuraciones.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={resetEverything}
                    className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-red-500/20"
                  >
                    <Trash2 size={20} />
                    borrar todo y restablecer web
                  </button>
                  <button 
                    onClick={() => setIsBottomPanelOpen(false)}
                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
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
