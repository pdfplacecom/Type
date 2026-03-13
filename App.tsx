import React, { useState, useRef, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Folder, Search, Sun, Moon, MoreVertical, Plus, Shield, X, Image as ImageIcon, Link as LinkIcon, FileText, Loader2, Film, Pencil, Trash2, Lock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

interface DocumentFolder {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  description?: string;
  created_at?: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Supabase state
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Admin & Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newThumbnail, setNewThumbnail] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch folders from Supabase on mount
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    if (!isSupabaseConfigured) {
      setFetchError('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      // Create a timeout promise that rejects after 8 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timed out. Please check if your Supabase URL is correct and the database is active.')), 8000);
      });

      // The actual fetch promise
      const fetchPromise = supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });

      // Race them so it doesn't hang forever
      const response = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (response.error) {
        throw response.error;
      }
      
      if (response.data) {
        setFolders(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      if (error.message === 'Failed to fetch') {
        setFetchError('Network error: Failed to connect to Supabase. Please check if your VITE_SUPABASE_URL is correct and includes "https://".');
      } else {
        setFetchError(error.message || 'An error occurred while fetching data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingFolder(null);
    setNewTitle('');
    setNewUrl('');
    setNewThumbnail('');
    setNewDescription('');
  };

  const openEditModal = (folder: DocumentFolder, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingFolder(folder);
    setNewTitle(folder.title);
    setNewUrl(folder.url || '');
    setNewThumbnail(folder.thumbnail || '');
    setNewDescription(folder.description || '');
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderToDelete(id);
  };

  const confirmDelete = async () => {
    if (!folderToDelete) return;
    
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderToDelete);
        
      if (error) throw error;
      
      setFolders(folders.filter(f => f.id !== folderToDelete));
      setFolderToDelete(null);
    } catch (error: any) {
      console.error('Error deleting movie:', error);
      setFetchError(`Failed to delete movie: ${error.message}`);
      setFolderToDelete(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    setIsSubmitting(true);
    try {
      const folderData = {
        title: newTitle,
        url: newUrl || null,
        thumbnail: newThumbnail || null,
        description: newDescription || null,
      };

      if (editingFolder) {
        const { data, error } = await supabase
          .from('folders')
          .update(folderData)
          .eq('id', editingFolder.id)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setFolders(folders.map(f => f.id === editingFolder.id ? data[0] : f));
        }
      } else {
        const { data, error } = await supabase
          .from('folders')
          .insert([folderData])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setFolders([data[0], ...folders]);
        }
      }
      
      closeModal();
    } catch (error: any) {
      console.error('Error saving movie:', error);
      alert(`Failed to save movie: ${error.message || 'Check your Supabase configuration.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFolders = folders.filter(folder => 
    folder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (folder.description && folder.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`min-h-screen font-sans pb-12 relative transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-4 py-4 sticky top-0 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDarkMode ? 'bg-black border-zinc-700' : 'bg-white border-gray-300 shadow-sm'}`}>
            <div className="flex flex-col items-center justify-center leading-none">
              <span className="font-display font-bold text-[10px] tracking-widest">M</span>
              <span className="font-display font-bold text-[10px] tracking-widest">W</span>
            </div>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Movie Wallah</span>
        </div>
        <div className={`flex items-center gap-5 ${isDarkMode ? 'text-zinc-300' : 'text-gray-600'}`}>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}
          >
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button className={`font-medium transition-colors text-base ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}>
            About
          </button>
          
          {/* Three Dot Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`transition-colors p-1 rounded-full ${isMenuOpen ? (isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-200 text-black') : (isDarkMode ? 'hover:text-white' : 'hover:text-black')}`}
            >
              <MoreVertical size={22} />
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl py-2 z-50 overflow-hidden ${isDarkMode ? 'bg-[#1a1a1a] border-zinc-800' : 'bg-white border-gray-200'}`}>
                <div className={`px-4 py-2 border-b mb-1 ${isDarkMode ? 'border-zinc-800/50' : 'border-gray-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Settings</p>
                </div>
                <button 
                  onClick={() => {
                    if (isAdmin) {
                      setIsAdmin(false);
                    } else {
                      setIsAdminModalOpen(true);
                    }
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}`}
                >
                  <Shield size={16} className={isAdmin ? "text-emerald-400" : (isDarkMode ? "text-zinc-400" : "text-gray-400")} /> 
                  {isAdmin ? 'Disable Admin Mode' : 'Enable Admin Mode'}
                </button>
                
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setIsAddModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm text-[#8b75cc] transition-colors mt-1 border-t ${isDarkMode ? 'hover:bg-zinc-800/50 border-zinc-800/50' : 'hover:bg-gray-50 border-gray-100'}`}
                  >
                    <Plus size={16} /> Add New Movie
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-2 mb-6">
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} size={20} />
          <input
            type="text"
            placeholder="Search all movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-[#8b75cc] text-base transition-colors ${isDarkMode ? 'bg-[#1a1a1a] text-white placeholder-zinc-500' : 'bg-white text-gray-900 placeholder-gray-400 shadow-sm border border-gray-200'}`}
          />
        </div>
      </div>

      <main className="px-4">
        <ErrorBoundary>
          {/* Folders Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold tracking-tight">Movies</h2>
              {isAdmin && (
                <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Admin Active
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="animate-spin text-[#8b75cc] mb-4" size={32} />
                <p className={isDarkMode ? 'text-zinc-400' : 'text-gray-500'}>Loading library...</p>
              </div>
            ) : fetchError ? (
              <div className={`text-center py-12 px-6 rounded-3xl border ${isDarkMode ? 'bg-[#1a1a1a] border-red-900/30' : 'bg-red-50 border-red-200'}`}>
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-red-900'}`}>Connection Error</h3>
                <p className={`text-sm max-w-md mx-auto ${isDarkMode ? 'text-zinc-400' : 'text-red-700'}`}>{fetchError}</p>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className={`text-center py-16 rounded-3xl border ${isDarkMode ? 'bg-[#1a1a1a] border-zinc-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <Film size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-zinc-600' : 'text-gray-400'}`} />
                <p className={isDarkMode ? 'text-zinc-400' : 'text-gray-500'}>No movies found.</p>
                {isAdmin && (
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2a2438] text-[#8b75cc] rounded-xl text-sm font-medium hover:bg-[#352d47] transition-colors"
                  >
                    <Plus size={16} /> Add your first movie
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredFolders.map((folder) => (
                  <a
                    key={folder.id}
                    href={folder.url || '#'}
                    target={folder.url ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className={`rounded-[1.25rem] p-3 flex flex-col gap-3 transition-all cursor-pointer border relative group ${isDarkMode ? 'bg-[#161616] border-transparent hover:border-zinc-700 hover:bg-[#1e1e1e]' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'}`}
                  >
                    {isAdmin && (
                      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                        <button 
                          onClick={(e) => openEditModal(folder, e)}
                          className="p-2 bg-black/70 hover:bg-black text-white rounded-full backdrop-blur-md transition-colors shadow-lg"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(folder.id, e)}
                          className="p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-colors shadow-lg"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <div className={`w-full aspect-[2/3] rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative ${isDarkMode ? 'bg-[#2a2438]' : 'bg-gray-100'}`}>
                      {folder.thumbnail ? (
                        <img 
                          src={folder.thumbnail} 
                          alt={folder.title} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Film 
                        className={`text-[#8b75cc] ${folder.thumbnail ? 'hidden' : ''}`} 
                        size={36} 
                        fill="currentColor" 
                        fillOpacity={0.2} 
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-full px-1 pb-1">
                      <span className={`font-semibold text-[14px] leading-snug line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {folder.title.replace(/\\n/g, '\n')}
                      </span>
                      {folder.description && (
                        <span className={`text-[11px] line-clamp-2 leading-tight mt-0.5 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                          {folder.description}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </ErrorBoundary>
      </main>

      {/* Admin Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1a1a1a] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-zinc-800/50 bg-[#161616]' : 'border-gray-100 bg-gray-50'}`}>
              <h3 className={`text-lg font-display font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingFolder ? <Pencil size={18} className="text-[#8b75cc]" /> : <Plus size={18} className="text-[#8b75cc]" />} 
                {editingFolder ? 'Edit Movie' : 'Add New Movie'}
              </h3>
              <button 
                onClick={closeModal}
                className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Movie Title *</label>
                <div className="relative">
                  <Film className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} size={16} />
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Inception \n (2010)"
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#8b75cc] focus:ring-1 focus:ring-[#8b75cc] transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-zinc-800 text-white placeholder-zinc-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Watch URL</label>
                <div className="relative">
                  <LinkIcon className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} size={16} />
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#8b75cc] focus:ring-1 focus:ring-[#8b75cc] transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-zinc-800 text-white placeholder-zinc-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Poster Image URL</label>
                <div className="relative">
                  <ImageIcon className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} size={16} />
                  <input
                    type="url"
                    value={newThumbnail}
                    onChange={(e) => setNewThumbnail(e.target.value)}
                    placeholder="https://.../poster.jpg"
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#8b75cc] focus:ring-1 focus:ring-[#8b75cc] transition-all ${isDarkMode ? 'bg-[#0a0a0a] border-zinc-800 text-white placeholder-zinc-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Description / Tags</label>
                <div className="relative">
                  <FileText className={`absolute left-3 top-3 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} size={16} />
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add genre, year, or description..."
                    rows={3}
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#8b75cc] focus:ring-1 focus:ring-[#8b75cc] transition-all resize-none ${isDarkMode ? 'bg-[#0a0a0a] border-zinc-800 text-white placeholder-zinc-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#2a2438] text-[#8b75cc] font-semibold rounded-xl hover:bg-[#352d47] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> {editingFolder ? 'Saving...' : 'Adding...'}</>
                  ) : (
                    <>{editingFolder ? <Pencil size={18} /> : <Plus size={18} />} {editingFolder ? 'Save Changes' : 'Add to Library'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1a1a1a] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className={`text-xl font-display font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delete Movie?</h3>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                Are you sure you want to delete this movie? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1a1a1a] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-zinc-800/50 bg-[#161616]' : 'border-gray-100 bg-gray-50'}`}>
              <h3 className={`text-lg font-display font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Lock size={18} className="text-[#8b75cc]" /> Admin Access
              </h3>
              <button 
                onClick={() => {
                  setIsAdminModalOpen(false);
                  setAdminPasswordInput('');
                  setAdminPasswordError(false);
                }}
                className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (adminPasswordInput === '00000000') {
                setIsAdmin(true);
                setIsAdminModalOpen(false);
                setAdminPasswordInput('');
                setAdminPasswordError(false);
              } else {
                setAdminPasswordError(true);
              }
            }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-medium uppercase tracking-wider mb-1.5 block ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Admin Password</label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      setAdminPasswordError(false);
                    }}
                    placeholder="Enter password"
                    className={`w-full border rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all ${adminPasswordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-[#8b75cc] focus:ring-[#8b75cc]'} ${isDarkMode ? 'bg-[#0a0a0a] border-zinc-800 text-white placeholder-zinc-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    autoFocus
                  />
                  {adminPasswordError && <p className="text-red-500 text-xs mt-1.5 font-medium">Incorrect password</p>}
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#2a2438] text-[#8b75cc] font-semibold rounded-xl hover:bg-[#352d47] transition-colors"
                >
                  Unlock Admin Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
