import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTasks } from '../../hooks/useTasks';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ReadOnlyBanner } from '../../components/shared/ReadOnlyBanner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, AlertTriangle, BarChart3, Users, Activity, Calendar, MessageSquare, UserCheck,
} from 'lucide-react';

const PRIORITY_COLORS = { low: 'bg-blue-100 text-blue-800', medium: 'bg-amber-100 text-amber-800', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800' };
const STATUS_LABELS = { planning: 'Planification', active: 'Actif', on_hold: 'En pause', completed: 'Terminé', cancelled: 'Annulé' };
const ACTION_LABELS = {
  project_created: 'a créé le projet', member_added: 'a ajouté un membre', member_removed: 'a retiré un membre',
  task_created: 'a créé une tâche', task_updated: 'a modifié une tâche', task_deleted: 'a supprimé une tâche',
  task_moved: 'a déplacé une tâche', comment_added: 'a commenté', attachment_added: 'a ajouté une pièce jointe',
  time_entry_added: 'a enregistré du temps',
};

export default function ViewerProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('kanban');

  const { data: project, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => api.get(`/projects/${id}`).then((r) => r.data.project) });
  const { data: statuses } = useQuery({ queryKey: ['statuses', id], queryFn: () => api.get(`/projects/${id}/statuses`).then((r) => r.data.statuses) });
  const { data: tasks } = useTasks(id);
  const { data: dashboard } = useQuery({ queryKey: ['project-dashboard', id], queryFn: () => api.get(`/projects/${id}/dashboard`).then((r) => r.data) });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!project) return <div className="py-20 text-center text-muted-foreground">Projet non trouvé</div>;

  const tasksByStatus = (statusId) => (tasks || []).filter((t) => t.status_id === statusId).sort((a, b) => a.kanban_order - b.kanban_order);

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 rounded-md p-1 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">{project.code}</span>
            <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>{STATUS_LABELS[project.status] || project.status}</Badge>
            <Badge variant="outline" className="text-xs">Lecture seule</Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
          {project.manager && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" /> Manager : <span className="font-medium text-foreground">{project.manager.name}</span>
            </p>
          )}
        </div>
      </div>

      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Total tâches" value={dashboard.total_tasks} />
          <MiniStat label="Terminées" value={dashboard.completed_tasks} />
          <MiniStat label="En retard" value={dashboard.overdue_tasks} color="text-destructive" />
          <MiniStat label="Progression" value={`${dashboard.avg_progress || 0}%`} />
          <MiniStat label="Heures estimées" value={dashboard.total_estimated_hours || 0} />
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'kanban', label: 'Kanban', icon: BarChart3 },
          { key: 'members', label: 'Membres', icon: Users },
          { key: 'activity', label: 'Activité', icon: Activity },
        ].map((t) => {
          const TabIcon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <TabIcon size={15} /> {t.label}
              {tab === t.key && <motion.div layoutId="viewer-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Kanban: read-only (no drag-and-drop, no add buttons) */}
      {tab === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(statuses || []).map((status, i) => {
            const columnTasks = tasksByStatus(status.id);
            return (
              <motion.div key={status.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: status.color || '#6b7280' }} />
                    <span className="text-[13px] font-semibold text-foreground">{status.name}</span>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">{columnTasks.length}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-2 pb-2 min-h-[60px]">
                  {columnTasks.map((task) => (
                    <div key={task.id} className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
                      <h4 className="mb-1.5 text-[13px] font-medium text-foreground leading-snug">{task.title}</h4>
                      {task.description && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground/80">{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>
                        {task.is_overdue && <span className="flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600"><AlertTriangle className="h-2.5 w-2.5" /> Retard</span>}
                        {task.due_date && !task.is_overdue && <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><Calendar className="h-2.5 w-2.5" />{new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                        {task.comments_count > 0 && <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><MessageSquare className="h-2.5 w-2.5" /> {task.comments_count}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        {task.assignees?.length > 0 ? <AvatarGroup max={3}>{task.assignees.map((a) => <Avatar key={a.id} name={a.user?.name || a.name} size="xs" />)}</AvatarGroup> : <div />}
                        {task.progress_percent > 0 && <div className="flex items-center gap-1.5 w-20"><ProgressBar value={task.progress_percent} size="sm" /><span className="text-[10px] font-medium text-muted-foreground">{task.progress_percent}%</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === 'members' && <MembersTab projectId={id} />}
      {tab === 'activity' && <ActivityTab projectId={id} />}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function MembersTab({ projectId }) {
  const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Manager', developer: 'Développeur', designer: 'Designer', tester: 'Testeur', viewer: 'Observateur' };
  const { data: members, isLoading } = useQuery({ queryKey: ['project-members', projectId], queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => r.data.members) });
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Membres du projet</h3>
      <div className="space-y-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.name || m.user?.name} size="sm" />
              <div><p className="text-sm font-medium text-foreground">{m.name || m.user?.name}</p><p className="text-xs text-muted-foreground">{m.email || m.user?.email}</p></div>
            </div>
            <Badge variant="secondary">{ROLE_LABELS[m.project_role || m.pivot?.project_role] || m.project_role || 'Membre'}</Badge>
          </div>
        ))}
        {members?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun membre</p>}
      </div>
    </div>
  );
}

function ActivityTab({ projectId }) {
  const { data: activities, isLoading } = useQuery({ queryKey: ['project-activities', projectId], queryFn: () => api.get(`/projects/${projectId}/activities`).then((r) => r.data.activities) });
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!activities?.length) return <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune activité</CardContent></Card>;
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Activity className="h-5 w-5" /> Journal d'activité</h3>
      <div className="relative border-l-2 border-border pl-6 space-y-4">
        {activities.map((a) => (
          <div key={a.id} className="relative">
            <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm"><span className="font-medium">{a.user?.name || 'Système'}</span>{' '}<span className="text-muted-foreground">{ACTION_LABELS[a.action] || a.action}</span>{a.properties?.title && <span className="font-medium ml-1">« {a.properties.title} »</span>}</p>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{a.human_time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
