import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Layout, Save, Image as ImageIcon, Star, Tag, CheckCircle2, AlertCircle, Plus, Trash2, GripVertical } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SingleImageUploader } from '../components/ui/SingleImageUploader';
import { SingleMediaUploader } from '../components/ui/SingleMediaUploader';
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
        carousel: [
            {
                id: '1',
                title: "Des villas d'exception au Sénégal",
                tagline: "Construisons l'avenir ensemble",
                image: 'https://images.unsplash.com/photo-1600585154340-be6199f7d009?q=80&w=2070&auto=format&fit=crop',
            },
            {
                id: '2',
                title: "Simulation gratuite en 2 minutes",
                tagline: "Planifiez votre budget",
                image: 'https://images.unsplash.com/photo-1541888086414-b80c33fb3537?q=80&w=2070&auto=format&fit=crop',
            },
            {
                id: '3',
                title: "Un expert BTP à votre écoute",
                tagline: "Conseils techniques gratuits",
                image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop',
            }
        ],
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

    const addCarouselItem = () => {
        setContent(prev => ({
            ...prev,
            carousel: [
                ...(prev.carousel || []),
                {
                    id: Date.now().toString(),
                    title: 'Nouvelle bannière',
                    tagline: 'Sous-titre',
                    image: ''
                }
            ]
        }));
    };

    const updateCarouselItem = (id: string, updates: any) => {
        setContent(prev => ({
            ...prev,
            carousel: (prev.carousel || []).map(item =>
                item.id === id ? { ...item, ...updates } : item
            )
        }));
    };

    const removeCarouselItem = (id: string) => {
        setContent(prev => ({
            ...prev,
            carousel: (prev.carousel || []).filter(item => item.id !== id)
        }));
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
                {/* Carousel Section */}
                <Card className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Layout className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold">Bannières du Carousel</h2>
                        </div>
                        <Button size="sm" onClick={addCarouselItem}>
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {(content.carousel || []).map((slide, index) => (
                            <div key={slide.id} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                        onClick={() => removeCarouselItem(slide.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        title="Supprimer cette bannière"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex items-start gap-4 mb-4">
                                    <h3 className="text-xs font-semibold uppercase text-gray-400">Slide {index + 1}</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Accroche (Tagline)"
                                            value={slide.tagline}
                                            onChange={(e) => updateCarouselItem(slide.id, { tagline: e.target.value })}
                                            placeholder="Ex: Planifiez votre budget"
                                        />
                                        <Input
                                            label="Titre principal"
                                            value={slide.title}
                                            onChange={(e) => updateCarouselItem(slide.id, { title: e.target.value })}
                                            placeholder="Ex: Des villas d'exception"
                                        />
                                    </div>
                                    <SingleMediaUploader
                                        label="Média de fond (Image ou Vidéo)"
                                        value={slide.image}
                                        mediaType={slide.type as any || 'image'}
                                        onChange={(url, type) => updateCarouselItem(slide.id, { image: url, type })}
                                        aspectRatio="video"
                                    />
                                </div>
                            </div>
                        ))}
                        {(!content.carousel || content.carousel.length === 0) && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-20" />
                                Aucune bannière ajoutée.
                            </div>
                        )}
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
