export class CloudinaryService {
    private readonly CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    private readonly UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    private readonly API_URL = `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/upload`;

    /**
     * Upload a file to Cloudinary
     */
    async uploadFile(file: File | string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<string> {
        if (!this.CLOUD_NAME || !this.UPLOAD_PRESET) {
            throw new Error('Cloudinary configuration missing. Please check your .env file.');
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.UPLOAD_PRESET);
            formData.append('resource_type', resourceType);

            const response = await fetch(this.API_URL, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            return data.secure_url;
        } catch (error) {
            console.error('Cloudinary Upload Error:', error);
            throw error;
        }
    }

    /**
     * Optimize Cloudinary URL
     */
    getOptimizedUrl(url: string, transformations: string = 'f_auto,q_auto'): string {
        if (!url || !url.includes('cloudinary.com')) return url;

        const parts = url.split('/upload/');
        if (parts.length !== 2) return url;

        return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    }
}

export const cloudinaryService = new CloudinaryService();
