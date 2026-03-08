import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSpacePrefix } from '../../hooks/useSpacePrefix';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { MetricCard } from '../../components/ui/MetricCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { motion } from 'framer-motion';
import {
  ListTodo, Search, AlertTriangle, Clock, Calendar,
  CheckCircle2, ArrowUpDown,
} from 'lucide-react';

const PRIORITY_MAP = {
  urgent: { label: 'Urgent', variant: 'destructive', order: 0 },
  high: { label: 'Haute', variant: 'warning', order: 1 },
  medium: { label: 'Moyenne', variant: 'secondary', order: 2 },
  low: { label: 'Basse', variant: 'outline', order: 3 },
};

const STATUS_DONE = ['terminé', 'done'];

export default function MyTasksPage() {
  const prefix = useSpacePrefix();
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // all | overdue | in-progress | done
  const [sortBy, setSortBy] = useState('due_date'); // due_date | priority | updated

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data.tasks),
  });

  const filtered = useMemo(() => {
    if (!tasks) return [];
    let list = [...tasks];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.project?.name?.toLowerCase().includes(q)
      );
    }

    // Priority filter
    if (filterPriority) {
      list = list.filter((t) => t.priority === filterPriority);
    }

    // Status filter
    if (filterStatus === 'overdue') {
      list = list.filter((t) => {
        const isDone = STATUS_DONE.includes(t.status?.name?.toLowerCase());
        return !isDone && t.due_date && new Date(t.due_date) < new Date();
      });
    } else if (filterStatus === 'in-progress') {
      list = list.filter((t) => !STATUS_DONE.includes(t.status?.name?.toLowerCase()));
    } else if (filterStatus === 'done') {
      list = list.filter((t) => STATUS_DONE.includes(t.status?.name?.toLowerCase()));
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'priority') {
        return (PRIORITY_MAP[a.priority]?.order ?? 4) - (PRIORITY_MAP[b.priority]?.order ?? 4);
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      }
      // updated
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });

    return list;
  }, [tasks, search, filterPriority, filterStatus, sortBy]);

  const totalTasks = tasks?.length || 0;
  const doneTasks = tasks?.filter((t) => STATUS_DONE.includes(t.status?.name?.toLowerCase())).length || 0;
  const overdueTasks = tasks?.filter((t) => {
    const isDone = STATUS_DONE.includes(t.status?.name?.toLowerCase());
    return !isDone && t.due_date && new Date(t.due_date) < new Date();
  }).length || 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes tâches"
        description="Toutes vos tâches assignées à travers tous les projets"
      />

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={ListTodo} label="Total" value={totalTasks} color="bg-primary/10 text-primary" />
        <MetricCard icon={CheckCircle2} label="Terminées" value={doneTasks} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="En retard" value={overdueTasks} color={overdueTasks > 0 ? 'bg-red-50 text-red-600' : 'bg-muted/50 text-muted-foreground'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher une tâche ou un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Toutes priorités</option>
          <option value="urgent">Urgent</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Toutes</option>
          <option value="in-progress">En cours</option>
          <option value="overdue">En retard</option>
          <option value="done">Terminées</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="due_date">Échéance</option>
          <option value="priority">Priorité</option>
          <option value="updated">Récent</option>
        </select>
      </div>

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Aucune tâche"
          description="Aucune tâche ne correspond à vos filtres"
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((task, i) => (
            <TaskRow key={task.id} task={task} prefix={prefix} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, prefix, index }) {
  const isDone = STATUS_DONE.includes(task.status?.name?.toLowerCase());
  const isOverdue = !isDone && task.due_date && new Date(task.due_date) < new Date();
  const priorityInfo = PRIORITY_MAP[task.priority] || { label: task.priority, variant: 'outline' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
    >
      <Link to={`${prefix}/projects/${task.project_id || task.project?.id}`}>
        <div className={`flex items-center justify-between rounded-xl border bg-white p-3.5 transition-all duration-200 hover:shadow-sm hover:border-border/80 ${isOverdue ? 'border-red-200/70' : 'border-border/50'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isDone ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            ) : isOverdue ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className={`text-[13px] font-medium truncate ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.project && (
                  <span className="text-[11px] text-muted-foreground">{task.project.name}</span>
                )}
                {task.status && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                    {task.status.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-4">
            <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
            {task.due_date && (
              <span className={`flex items-center gap-1 text-[11px] ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {task.progress_percent > 0 && (
              <div className="flex items-center gap-1.5 w-16">
                <ProgressBar value={task.progress_percent} size="sm" />
                <span className="text-[10px] font-medium text-muted-foreground">{task.progress_percent}%</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
