import { useRef, useState } from 'react';
import { useUploadLogo, useDeleteLogo } from '@/lib/api-client';

interface LogoUploadProps {
  farmId: string;
  currentLogoUrl?: string | null;
}

export function LogoUpload({ farmId, currentLogoUrl }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadLogo(farmId);
  const deleteLogo = useDeleteLogo(farmId);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: PNG, JPG, SVG');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    try {
      await uploadLogo.mutateAsync(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return;
    try {
      await deleteLogo.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete logo');
    }
  };

  // Get full logo URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const logoUrl = currentLogoUrl
    ? `${API_BASE}${currentLogoUrl}`
    : null;

  return (
    <div className="space-y-4">
      {/* Current Logo Preview */}
      {logoUrl && (
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-muted/30">
            <img
              src={logoUrl}
              alt="Farm logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current logo</p>
            <button
              onClick={handleDelete}
              disabled={deleteLogo.isPending}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {deleteLogo.isPending ? 'Removing...' : 'Remove logo'}
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          onChange={handleChange}
          className="hidden"
        />

        <div className="text-4xl mb-2">📷</div>
        <p className="text-sm font-medium">
          {uploadLogo.isPending ? 'Uploading...' : 'Drop logo here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, or SVG up to 2MB
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
