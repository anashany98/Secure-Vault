import { useState } from 'react';
import { StickyNote, Star, Trash2, Edit2, Copy, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotes } from '../../context/NotesContext';

const NoteCard = ({ note, onEdit }) => {
    const { deleteNote, toggleFavoriteNote } = useNotes();
    const [showContent, setShowContent] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(note.content);
        toast.success('Nota copiada al portapapeles');
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 group">
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <StickyNote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{note.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(note.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteNote(note.id);
                        }}
                        className={`p-1.5 rounded-full transition-colors ${note.isFavorite
                                ? 'text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>

                <div className="relative mb-4">
                    <div className={`text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 min-h-[80px] ${!showContent ? 'line-clamp-3 blur-[2px] select-none cursor-pointer' : ''}`}
                        onClick={() => setShowContent(!showContent)}>
                        {note.content}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowContent(!showContent)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title={showContent ? "Ocultar" : "Mostrar"}
                        >
                            {showContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleCopy}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Copiar contenido"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(note);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Estás seguro de mover esta nota a la papelera?')) {
                                    deleteNote(note.id);
                                    toast.success('Nota movida a la papelera');
                                }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteCard;
