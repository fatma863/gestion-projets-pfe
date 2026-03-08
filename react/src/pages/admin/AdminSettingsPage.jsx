import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { User, Mail, Shield, Clock, Calendar, Settings as SettingsIcon } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres système</h1>
        <p className="text-muted-foreground">Configuration générale et profil administrateur</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mon profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
                {user?.name?.[0] || '?'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <InfoRow icon={User} label="Nom" value={user?.name} />
              <InfoRow icon={Mail} label="Email" value={user?.email} />
              <InfoRow icon={Clock} label="Fuseau horaire" value={user?.timezone || 'Africa/Tunis'} />
              <InfoRow
                icon={Calendar}
                label="Inscrit le"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rôles & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Rôles</p>
              <div className="flex flex-wrap gap-2">
                {(user?.roles || []).map((role) => (
                  <Badge key={typeof role === 'string' ? role : role.name} variant="default">
                    <Shield className="mr-1 h-3 w-3" />
                    {typeof role === 'string' ? role : role.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {(user?.permissions || []).map((perm) => (
                  <Badge key={typeof perm === 'string' ? perm : perm.name} variant="outline" className="text-xs">
                    {typeof perm === 'string' ? perm : perm.name}
                  </Badge>
                ))}
                {(!user?.permissions || user.permissions.length === 0) && (
                  <span className="text-sm text-muted-foreground">Aucune permission directe</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SettingsIcon className="h-5 w-5" /> Informations système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-accent/30 p-4">
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">1.0.0</p>
              </div>
              <div className="rounded-lg bg-accent/30 p-4">
                <p className="text-sm text-muted-foreground">Framework</p>
                <p className="text-lg font-semibold">Laravel 12 + React 19</p>
              </div>
              <div className="rounded-lg bg-accent/30 p-4">
                <p className="text-sm text-muted-foreground">RBAC</p>
                <p className="text-lg font-semibold">Spatie Permission</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-28 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}
