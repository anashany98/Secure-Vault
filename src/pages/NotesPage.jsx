import { useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { useNotes } from '../context/NotesContext';
import NoteCard from '../components/notes/NoteCard';
import AddNoteModal from '../components/notes/AddNoteModal';

const NotesPage = () => {
    const { notes } = useNotes();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    const activeNotes = notes.filter(n => !n.isDeleted);

    const filteredNotes = activeNotes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (note) => {
        setEditingNote(note);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingNote(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Notas Seguras
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Almacena información confidencial y documentos de texto.
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Nota
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar en tus notas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                />
            </div>

            {filteredNotes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {searchQuery ? 'No se encontraron notas' : 'No tienes notas seguras'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        {searchQuery
                            ? 'Intenta con otros términos de búsqueda.'
                            : 'Crea tu primera nota segura para guardar información importante.'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
                        >
                            Crear una nota ahora &rarr;
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}

            <AddNoteModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                editingNote={editingNote}
            />
        </div>
    );
};

export default NotesPage;
