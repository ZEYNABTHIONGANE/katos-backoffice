import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { storageService } from '../../services/storageService';

interface SingleImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    error?: string;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'any';
}

export const SingleImageUploader: React.FC<SingleImageUploaderProps> = ({
    value,
    onChange,
    label = "Image",
    error,
    aspectRatio = 'video'
}) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            storageService.validateImageFile(file);
            const url = await storageService.uploadImage(file);
            onChange(url);
        } catch (error: any) {
            alert(error.message || 'Erreur lors de l\'upload');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeImage = () => {
        onChange('');
    };

    const getAspectClass = () => {
        switch (aspectRatio) {
            case 'square': return 'aspect-square';
            case 'video': return 'aspect-video';
            case 'portrait': return 'aspect-[3/4]';
            default: return 'aspect-auto min-h-[150px]';
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-semibold text-gray-900">
                    {label}
                </label>
            )}

            {value ? (
                <div className={`relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 ${getAspectClass()}`}>
                    <img
                        src={value}
                        alt="Uploaded"
                        className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                        <label className="cursor-pointer shadow-sm">
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={uploading} />
                            <div className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 transition-colors">
                                {uploading ? 'Upload...' : 'Changer'}
                            </div>
                        </label>
                        <button
                            type="button"
                            onClick={removeImage}
                            className="p-1.5 bg-white/90 backdrop-blur-sm hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 rounded-md shadow-sm transition-colors"
                            title="Supprimer l'image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <label className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${getAspectClass()}`}>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={uploading} />
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-primary-600 animate-bounce mb-2" />
                            <p className="text-sm text-gray-600">Upload en cours...</p>
                        </div>
                    ) : (
                        <>
                            <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 font-medium">Cliquer pour envoyer</p>
                            <p className="text-xs text-gray-400">JPG, PNG ou WebP (max 5MB)</p>
                        </>
                    )}
                </label>
            )}

            {error && (
                <p className="text-red-600 text-xs mt-1">{error}</p>
            )}
        </div>
    );
};
