import { X, Tag as TagIcon } from 'lucide-react';
import { useState } from 'react';
import { getTagColor, getRandomTagColor, DEFAULT_TAGS } from '../../lib/tagColors';

export default function TagInput({ tags = [], onChange }) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    const handleInputChange = (e) => {
        const value = e.target.value.toLowerCase();
        setInputValue(value);

        if (value.length > 0) {
            const filtered = DEFAULT_TAGS
                .filter(tag => tag.name.startsWith(value) && !tags.find(t => t.name === tag.name))
                .slice(0, 5);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const addTag = (tagName, color = null) => {
        if (!tagName || tags.find(t => t.name === tagName)) return;

        const newTag = {
            name: tagName.toLowerCase().trim(),
            color: color || getRandomTagColor()
        };

        onChange([...tags, newTag]);
        setInputValue('');
        setSuggestions([]);
    };

    const removeTag = (tagName) => {
        onChange(tags.filter(t => t.name !== tagName));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1].name);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
                <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4" />
                    Tags (opcional)
                </div>
            </label>

            {/* Tag Display */}
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-900 border border-slate-700 rounded-lg">
                {tags.map(tag => {
                    const colorClasses = getTagColor(tag.color);
                    return (
                        <span
                            key={tag.name}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}
                        >
                            {tag.name}
                            <button
                                type="button"
                                onClick={() => removeTag(tag.name)}
                                className="hover:opacity-70 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}

                {/* Input */}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? "Escribe y presiona Enter..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white placeholder-slate-500 text-sm"
                />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                    {suggestions.map(tag => {
                        const colorClasses = getTagColor(tag.color);
                        return (
                            <button
                                key={tag.name}
                                type="button"
                                onClick={() => addTag(tag.name, tag.color)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                            >
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}>
                                    {tag.name}
                                </span>
                                <span className="text-xs text-slate-500">Sugerencia</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <p className="text-xs text-slate-500">
                💡 Presiona Enter para añadir, Backspace para eliminar
            </p>
        </div>
    );
}
