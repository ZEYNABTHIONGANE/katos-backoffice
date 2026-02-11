import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Layout, Save, Image as ImageIcon, Star, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SingleImageUploader } from '../components/ui/SingleImageUploader';
import { showcaseService } from '../services/showcaseService';
import type { ShowcaseContent } from '../services/showcaseService';
import { useProjectStore } from '../store/projectStore';

export const Showcase: React.FC = () => {
    const { projects } = useProjectStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState<ShowcaseContent>({
        heroProject: {
            title: 'AS SALAM SA KEUR',
            subtitle: 'Nouveau programme résidentiel',
            description: 'Une cité moderne alliant confort et sécurité.',
            imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6199f7d009?q=80&w=2070&auto=format&fit=crop',
        },
        promo: {
            active: true,
            title: 'Offre Spéciale',
            subtitle: '-10% sur les frais de dossier ce mois-ci',
        },
        featuredVillas: [],
        updatedAt: null,
    });

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await showcaseService.getShowcaseContent();
                if (data) {
                    setContent(data);
                }
            } catch (error) {
                console.error('Error fetching showcase content:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await showcaseService.updateShowcaseContent(content);
            toast.success('Contenu du Showcase mis à jour avec succès');
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setSaving(false);
        }
    };

    const toggleFeaturedVilla = (projectId: string) => {
        setContent(prev => {
            const featured = [...prev.featuredVillas];
            const index = featured.indexOf(projectId);
            if (index > -1) {
                featured.splice(index, 1);
            } else {
                featured.push(projectId);
            }
            return { ...prev, featuredVillas: featured };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Showcase Mobile</h1>
                    <p className="text-gray-600">Gérez le contenu public de l'application mobile</p>
                </div>
                <Button onClick={handleSave} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer les modifications
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hero Section */}
                <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b pb-4 mb-4">
                        <Layout className="w-5 h-5 text-primary-600" />
                        <h2 className="text-lg font-semibold">Section Hero (Projet Phare)</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Projet Phare (Titre)</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                                value={content.heroProject.title}
                                onChange={(e) => {
                                    setContent({
                                        ...content,
                                        heroProject: {
                                            ...content.heroProject,
                                            title: e.target.value,
                                            // Optional: auto-fill description if empty? 
                                            // For now just keep it as is but use the select
                                        }
                                    });
                                }}
                            >
                                <option value="">Sélectionnez un projet</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Sous-titre"
                            value={content.heroProject.subtitle}
                            onChange={(e) => setContent({
                                ...content,
                                heroProject: { ...content.heroProject, subtitle: e.target.value }
                            })}
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                                value={content.heroProject.description}
                                onChange={(e) => setContent({
                                    ...content,
                                    heroProject: { ...content.heroProject, description: e.target.value }
                                })}
                            />
                        </div>
                        <SingleImageUploader
                            label="Image du Projet Phare"
                            value={content.heroProject.imageUrl}
                            onChange={(url) => setContent({
                                ...content,
                                heroProject: { ...content.heroProject, imageUrl: url }
                            })}
                            aspectRatio="video"
                        />
                    </div>
                </Card>

                {/* Promo Section */}
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Tag className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold">Offre Promotionnelle</h2>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={content.promo.active}
                                    onChange={(e) => setContent({
                                        ...content,
                                        promo: { ...content.promo, active: e.target.checked }
                                    })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Titre de l'offre"
                                value={content.promo.title}
                                onChange={(e) => setContent({
                                    ...content,
                                    promo: { ...content.promo, title: e.target.value }
                                })}
                                disabled={!content.promo.active}
                            />
                            <Input
                                label="Description courte"
                                value={content.promo.subtitle}
                                onChange={(e) => setContent({
                                    ...content,
                                    promo: { ...content.promo, subtitle: e.target.value }
                                })}
                                disabled={!content.promo.active}
                            />
                        </div>
                    </Card>

                    {/* Features villas */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 border-b pb-4 mb-4">
                            <Star className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold">Villas à la une</h2>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Sélectionnez les villas qui apparaîtront dans le catalogue du showcase mobile.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => toggleFeaturedVilla(project.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${content.featuredVillas.includes(project.id)
                                        ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                                        : 'border-gray-200 hover:border-primary-300'
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                        {project.images?.[0] ? (
                                            <img src={project.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-full h-full p-2 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{project.type}</p>
                                    </div>
                                    {content.featuredVillas.includes(project.id) && (
                                        <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {projects.length === 0 && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-20" />
                                Aucun projet disponible. Créez-en dans la section Villas.
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};
