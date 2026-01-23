import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface CoachNameDisplayProps {
    coachName: string;
    onSave: (newName: string) => void;
    align?: 'left' | 'right' | 'center';
    readOnly?: boolean;
    placeholder?: string;
}

export const CoachNameDisplay: React.FC<CoachNameDisplayProps> = ({
    coachName,
    onSave,
    align = 'left',
    readOnly = false,
    placeholder = 'Nome do Técnico'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(coachName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditedName(coachName);
    }, [coachName]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editedName.trim() !== coachName) {
            onSave(editedName.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedName(coachName);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    const getAlignmentClass = () => {
        switch (align) {
            case 'right': return 'flex-row-reverse';
            case 'center': return 'justify-center';
            default: return '';
        }
    };

    if (isEditing) {
        return (
            <div className={`flex items-center gap-2 ${getAlignmentClass()} bg-[#1a1f2e] p-1 rounded border border-gray-700`}>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">
                    Técnico:
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-[#242938] text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-40"
                    placeholder={placeholder}
                />
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleSave}
                        className="p-1 hover:bg-green-500/20 text-green-500 rounded transition-colors"
                        title="Salvar"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        onClick={handleCancel}
                        className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                        title="Cancelar"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onDoubleClick={() => !readOnly && setIsEditing(true)}
            className={`group flex items-center gap-2 ${getAlignmentClass()} ${readOnly ? '' : 'cursor-pointer hover:bg-white/5'} py-1 px-2 rounded transition-colors`}
        >
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Técnico:
            </span>
            <span
                className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors"
                style={{ color: coachName ? undefined : '#6b7280' }}
            >
                {coachName || placeholder}
            </span>
            {!readOnly && (
                <Pencil
                    size={12}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 transition-opacity"
                />
            )}
        </div>
    );
};
