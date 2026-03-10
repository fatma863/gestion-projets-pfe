import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useSprint, useBurndown } from '../../hooks/useSprints';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AvatarGroup } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import {
  Target, Calendar, ListTodo, TrendingDown,
  CheckCircle2, MessageSquare, Users,
} from 'lucide-react';

const STATUS_MAP = {
  planned: { label: 'Planifié', variant: 'secondary' },
  active: { label: 'Actif', variant: 'success' },
  completed: { label: 'Terminé', variant: 'default' },
};

const PRIORITY_MAP = {
  low: { label: 'Basse', variant: 'secondary' },
  medium: { label: 'Moyenne', variant: 'info' },
  high: { label: 'Haute', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

export default function MemberSprintDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  const { data: sprint, isLoading } = useSprint(id);
  const { data: burndownData } = useBurndown(id);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!sprint) return <EmptyState title="Sprint introuvable" />;

  const tasks = sprint.tasks || [];
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 1), 0);
  const doneCount = tasks.filter((t) => t.progress_percent >= 100).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={sprint.name}
        description={sprint.goal}
        back
        actions={
          <div className="flex gap-2">
            <Link to={`/app/standups/${id}?project=${projectId}`}>
              <Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Standups</Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Tâches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{doneCount}</p>
              <p className="text-xs text-muted-foreground">Terminées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">Points totaux</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{sprint.start_date}</p>
              <p className="text-xs text-muted-foreground">→ {sprint.end_date}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Burndown */}
      {burndownData?.burndown?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" /> Burndown Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BurndownChart data={burndownData.burndown} totalPoints={burndownData.total_points} />
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tâches du sprint</CardTitle>
            <Badge variant={STATUS_MAP[sprint.status]?.variant}>{STATUS_MAP[sprint.status]?.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!tasks.length ? (
            <EmptyState icon={ListTodo} title="Aucune tâche" description="Ce sprint n'a pas encore de tâches" />
          ) : (
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge variant={PRIORITY_MAP[task.priority]?.variant || 'outline'} className="text-[10px]">
                        {PRIORITY_MAP[task.priority]?.label || task.priority}
                      </Badge>
                      {task.story_points && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {task.story_points} pts
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.status && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.status.color || '#94a3b8' }} />
                          {task.status.name}
                        </span>
                      )}
                      {task.assignees?.length > 0 && (
                        <AvatarGroup users={task.assignees} max={3} size="xs" />
                      )}
                      <span>{task.progress_percent || 0}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Burndown Chart (SVG) ─────────────────────────────── */
function BurndownChart({ data, totalPoints }) {
  if (!data?.length) return null;

  const width = 700;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxY = totalPoints || Math.max(...data.map((d) => d.ideal));
  const xScale = (i) => padding.left + (i / (data.length - 1)) * chartW;
  const yScale = (v) => padding.top + chartH - (v / maxY) * chartH;

  const idealLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.ideal)}`).join(' ');
  const actualData = data.filter((d) => d.actual !== null);
  const actualLine = actualData.map((d, i) => {
    const idx = data.indexOf(d);
    return `${i === 0 ? 'M' : 'L'}${xScale(idx)},${yScale(d.actual)}`;
  }).join(' ');

  const labelInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 300 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <g key={frac}>
          <line x1={padding.left} y1={yScale(maxY * frac)} x2={width - padding.right} y2={yScale(maxY * frac)} stroke="#e2e8f0" strokeDasharray="4,4" />
          <text x={padding.left - 8} y={yScale(maxY * frac) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{Math.round(maxY * frac)}</text>
        </g>
      ))}
      <path d={idealLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />
      {actualLine && <path d={actualLine} fill="none" stroke="#6366f1" strokeWidth="2.5" />}
      {actualData.map((d) => {
        const idx = data.indexOf(d);
        return <circle key={idx} cx={xScale(idx)} cy={yScale(d.actual)} r="3.5" fill="#6366f1" />;
      })}
      {data.map((d, i) => {
        if (i % labelInterval !== 0 && i !== data.length - 1) return null;
        return <text key={i} x={xScale(i)} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{d.date.slice(5)}</text>;
      })}
      <g transform={`translate(${padding.left + 10}, ${padding.top + 10})`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,3" />
        <text x="25" y="4" className="fill-slate-500 text-[11px]">Idéal</text>
        <line x1="80" y1="0" x2="100" y2="0" stroke="#6366f1" strokeWidth="2.5" />
        <text x="105" y="4" className="fill-slate-500 text-[11px]">Réel</text>
      </g>
    </svg>
  );
}
