import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useNotifications';

export default function ManagerNotificationsPage() {
  const { data, isLoading } = useNotifications({ perPage: 50 });
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count ?? notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes lues'}
        actions={
          <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={unreadCount === 0 || markAllMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer comme lu
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Aucune notification</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif.id} className={`flex items-start justify-between rounded-lg border p-4 transition-colors ${notif.read_at ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${notif.read_at ? 'bg-muted' : 'bg-primary'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{notif.title || notif.type}</p>
                  {notif.message && <p className="mt-0.5 text-sm text-muted-foreground">{notif.message}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {notif.read_at && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Lu</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(notif.id)} disabled={!!notif.read_at || markReadMutation.isPending} className={notif.read_at ? 'opacity-50 cursor-not-allowed' : ''}>
                  <Check className="h-4 w-4" />
                  <span className="ml-1 text-xs">Marquer comme lu</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
