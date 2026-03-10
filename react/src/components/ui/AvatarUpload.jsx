import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Camera, Loader2, Trash2 } from 'lucide-react';

export function AvatarUpload() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/me/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      updateUser(data.user);
      setPreview(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/me/avatar');
      return data;
    },
    onSuccess: (data) => {
      updateUser(data.user);
      setPreview(null);
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;

    setPreview(URL.createObjectURL(file));
    uploadMutation.mutate(file);
  };

  const isPending = uploadMutation.isPending || removeMutation.isPending;
  const hasAvatar = !!(preview || user?.avatar);

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        {hasAvatar ? (
          <img
            src={preview || user.avatar}
            alt={user?.name || ''}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <Avatar name={user?.name} size="xl" className="h-20 w-20 text-2xl ring-2 ring-primary/20" />
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{user?.name}</h3>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-primary hover:underline"
            disabled={isPending}
          >
            {uploadMutation.isPending ? 'Envoi en cours...' : 'Changer la photo'}
          </button>
          {hasAvatar && !preview && (
            <button
              type="button"
              onClick={() => removeMutation.mutate()}
              className="flex items-center gap-1 text-xs text-destructive hover:underline"
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3" />
              {removeMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
