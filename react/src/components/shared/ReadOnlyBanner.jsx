import { Eye } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
      <Eye className="h-4 w-4 shrink-0" />
      <span>Mode consultation — Vous avez un accès en lecture seule</span>
    </div>
  );
}
