import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { X, Plus, Tag } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
    readOnly?: boolean;
}

export function TagInput({ tags = [], onTagsChange, placeholder = "Adicionar tag...", readOnly = false }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                const newTags = [...tags, inputValue.trim()];
                if (typeof onTagsChange === 'function') {
                    onTagsChange(newTags);
                }
            }
            setInputValue('');
        }
    };

    const addTag = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (inputValue.trim()) {
            if (!tags.includes(inputValue.trim())) {
                const newTags = [...tags, inputValue.trim()];
                if (typeof onTagsChange === 'function') {
                    onTagsChange(newTags);
                }
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        if (typeof onTagsChange === 'function') {
            onTagsChange(tags.filter(tag => tag !== tagToRemove));
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#27D888]/10 text-[#27D888] border border-[#27D888]/20 group transition-all hover:bg-[#27D888]/20"
                    >
                        <Tag className="w-3.5 h-3.5 opacity-70" />
                        {tag}
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                                className="ml-1 p-0.5 rounded-full hover:bg-[#27D888]/20 text-[#27D888] hover:text-white transition-colors focus:outline-none cursor-pointer"
                                aria-label={`Remover tag ${tag}`}
                            >
                                <X className="w-3 h-3 pointer-events-none" />
                            </button>
                        )}
                    </span>
                ))}
            </div>

            {!readOnly && (
                <div className="relative flex items-center group">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full bg-[#161618] text-white border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:border-[#27D888] focus:ring-1 focus:ring-[#27D888] outline-none transition-all placeholder-gray-500"
                    />
                    <button
                        type="button"
                        onMouseDown={addTag}
                        disabled={!inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-[#27D888] hover:bg-[#27D888]/10 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all z-30 cursor-pointer flex items-center justify-center"
                        title="Adicionar Tag"
                    >
                        <Plus className="w-4 h-4 pointer-events-none" />
                    </button>
                </div>
            )}
        </div>
    );
}
