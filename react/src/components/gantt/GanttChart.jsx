import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { AlertTriangle, ChevronDown, ChevronRight, Users, ZoomIn, ZoomOut, Calendar } from 'lucide-react';

// ── Constants ────────────────────────────────────────
const PRIORITY_COLORS = { low: '#3b82f6', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' };
const RISK_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a', none: '#6b7280' };
const DEP_TYPE_LABELS = { FS: 'Fin→Début', SS: 'Début→Début', FF: 'Fin→Fin', SF: 'Début→Fin' };
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 280;
const DAY_PX = { day: 40, week: 12, month: 4 };
const VIEW_MODES = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
];

function riskLevel(score) {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Tooltip ──────────────────────────────────────────
function Tooltip({ task, x, y, visible }) {
  if (!visible || !task) return null;
  const risk = task.risk_score != null ? riskLevel(task.risk_score) : null;
  return (
    <div
      className="pointer-events-none fixed z-[100] w-72 rounded-lg border border-border bg-popover p-3 shadow-lg text-sm"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-semibold text-foreground mb-1 truncate">{task.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Début</span><span className="font-medium text-foreground">{formatDate(task.start)}</span>
        <span>Fin</span><span className="font-medium text-foreground">{formatDate(task.end)}</span>
        <span>Durée</span><span className="font-medium text-foreground">{Math.max(1, daysBetween(task.start, task.end))}j</span>
        <span>Progression</span><span className="font-medium text-foreground">{task.progress}%</span>
        {task.assignees?.length > 0 && (
          <><span>Assigné(s)</span><span className="font-medium text-foreground truncate">{task.assignees.join(', ')}</span></>
        )}
        {task.estimated_hours != null && (
          <><span>Estimé</span><span className="font-medium text-foreground">{task.estimated_hours}h</span></>
        )}
        {task.is_critical && (
          <><span>Chemin critique</span><span className="font-medium text-red-600">Oui</span></>
        )}
        {risk && risk !== 'none' && (
          <><span>Risque</span><span className="font-medium" style={{ color: RISK_COLORS[risk] }}>{task.risk_score}%</span></>
        )}
      </div>
    </div>
  );
}

// ── Workload Panel ───────────────────────────────────
function WorkloadPanel({ workload }) {
  if (!workload?.members?.length) return null;
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Charge de travail — Équipe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {workload.members.map((m) => (
            <div key={m.user_id} className={`rounded-lg border p-3 text-sm ${m.overloaded ? 'border-red-300 bg-red-50' : 'border-border bg-white'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">{m.name}</span>
                <Badge variant={m.overloaded ? 'destructive' : m.utilization_percent > 80 ? 'warning' : 'success'}>{m.utilization_percent}%</Badge>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${m.overloaded ? 'bg-red-500' : m.utilization_percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(m.utilization_percent, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{m.active_tasks_count} tâches</span>
                <span>{m.weekly_load_hours}h / {m.capacity_hours}h</span>
              </div>
              {m.overloaded && m.overload_reasons?.length > 0 && (
                <p className="mt-1 text-xs text-red-600">{m.overload_reasons[0]}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Dependency Lines (SVG) ───────────────────────────
function DependencyLines({ tasks, taskMap, minDate, dayPx, scrollLeft }) {
  const lines = useMemo(() => {
    const result = [];
    tasks.forEach((task, rowIdx) => {
      if (!task.dependencies?.length) return;
      task.dependencies.forEach((dep) => {
        const predIdx = tasks.findIndex((t) => t.id === dep.id);
        if (predIdx === -1) return;
        const pred = tasks[predIdx];
        const type = dep.type || 'FS';

        let fromX, toX;
        // FS: end of predecessor -> start of successor
        if (type === 'FS') {
          fromX = daysBetween(minDate, pred.end) * dayPx;
          toX = daysBetween(minDate, task.start) * dayPx;
        } else if (type === 'SS') {
          fromX = daysBetween(minDate, pred.start) * dayPx;
          toX = daysBetween(minDate, task.start) * dayPx;
        } else if (type === 'FF') {
          fromX = daysBetween(minDate, pred.end) * dayPx;
          toX = daysBetween(minDate, task.end) * dayPx;
        } else {
          fromX = daysBetween(minDate, pred.start) * dayPx;
          toX = daysBetween(minDate, task.end) * dayPx;
        }

        const fromY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        const toY = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

        result.push({ key: `${pred.id}-${task.id}`, fromX, fromY, toX, toY, type });
      });
    });
    return result;
  }, [tasks, minDate, dayPx]);

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: tasks.length * ROW_HEIGHT }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>
      {lines.map((l) => {
        const midX = l.fromX + (l.toX - l.fromX) / 2;
        return (
          <path
            key={l.key}
            d={`M ${l.fromX} ${l.fromY} C ${midX} ${l.fromY}, ${midX} ${l.toY}, ${l.toX} ${l.toY}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray={l.type !== 'FS' ? '4,3' : 'none'}
            markerEnd="url(#arrow)"
          />
        );
      })}
    </svg>
  );
}

// ── Main GanttChart Component ────────────────────────
export default function GanttChart({
  tasks = [],
  criticalPath = null,
  workload = null,
  readOnly = false,
  onTaskUpdate = null,
  projectId = null,
}) {
  const [viewMode, setViewMode] = useState('week');
  const [tooltip, setTooltip] = useState({ visible: false, task: null, x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const chartRef = useRef(null);
  const dayPx = DAY_PX[viewMode];

  // Build task index map
  const taskMap = useMemo(() => {
    const map = {};
    tasks.forEach((t, i) => { map[t.id] = i; });
    return map;
  }, [tasks]);

  // Timeline bounds
  const { minDate, maxDate, totalDays, timeHeaders } = useMemo(() => {
    if (!tasks.length) return { minDate: new Date().toISOString().split('T')[0], maxDate: new Date().toISOString().split('T')[0], totalDays: 1, timeHeaders: [] };

    let min = Infinity, max = -Infinity;
    tasks.forEach((t) => {
      if (t.start) min = Math.min(min, new Date(t.start).getTime());
      if (t.end) max = Math.max(max, new Date(t.end).getTime());
    });
    const pad = 4 * 86400000;
    min -= pad;
    max += pad;
    const minDateStr = new Date(min).toISOString().split('T')[0];
    const maxDateStr = new Date(max).toISOString().split('T')[0];
    const totalDays = Math.ceil((max - min) / 86400000);

    // Build time headers based on view mode
    const headers = [];
    const cursor = new Date(min);
    if (viewMode === 'day') {
      while (cursor.getTime() <= max) {
        headers.push({
          label: cursor.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          offset: daysBetween(minDateStr, cursor.toISOString().split('T')[0]),
          span: 1,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (viewMode === 'week') {
      cursor.setDate(cursor.getDate() - cursor.getDay() + 1);
      while (cursor.getTime() <= max) {
        const weekStart = new Date(cursor);
        headers.push({
          label: weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          offset: Math.max(0, daysBetween(minDateStr, weekStart.toISOString().split('T')[0])),
          span: 7,
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else {
      const monthCursor = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
      while (monthCursor.getTime() <= max) {
        headers.push({
          label: monthCursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          offset: Math.max(0, daysBetween(minDateStr, monthCursor.toISOString().split('T')[0])),
          span: new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate(),
        });
        monthCursor.setMonth(monthCursor.getMonth() + 1);
      }
    }

    return { minDate: minDateStr, maxDate: maxDateStr, totalDays, timeHeaders: headers };
  }, [tasks, viewMode]);

  const chartWidth = totalDays * dayPx;

  // Today marker position
  const todayOffset = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const offset = daysBetween(minDate, today);
    return offset >= 0 && offset <= totalDays ? offset * dayPx : null;
  }, [minDate, totalDays, dayPx]);

  // Drag handlers
  const handleMouseDown = useCallback((e, task, mode) => {
    if (readOnly || !onTaskUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const origStart = task.start;
    const origEnd = task.end;
    setDragging({ taskId: task.id, mode, startX, origStart, origEnd });
  }, [readOnly, onTaskUpdate]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e) => {
      const dx = e.clientX - dragging.startX;
      const daysDelta = Math.round(dx / dayPx);
      if (daysDelta === 0) return;

      const task = tasks.find((t) => t.id === dragging.taskId);
      if (!task) return;

      if (dragging.mode === 'move') {
        task.start = addDays(dragging.origStart, daysDelta);
        task.end = addDays(dragging.origEnd, daysDelta);
      } else if (dragging.mode === 'resize-end') {
        const newEnd = addDays(dragging.origEnd, daysDelta);
        if (new Date(newEnd) >= new Date(task.start)) {
          task.end = newEnd;
        }
      } else if (dragging.mode === 'resize-start') {
        const newStart = addDays(dragging.origStart, daysDelta);
        if (new Date(newStart) <= new Date(task.end)) {
          task.start = newStart;
        }
      }
      setDragging((d) => ({ ...d })); // force re-render
    };

    const handleUp = () => {
      const task = tasks.find((t) => t.id === dragging.taskId);
      if (task && onTaskUpdate) {
        const origStart = dragging.origStart;
        const origEnd = dragging.origEnd;
        if (task.start !== origStart || task.end !== origEnd) {
          onTaskUpdate(task.id, task.start, task.end);
        }
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, tasks, dayPx, onTaskUpdate]);

  // Tooltip handlers
  const showTooltip = useCallback((e, task) => {
    setTooltip({ visible: true, task, x: e.clientX, y: e.clientY });
  }, []);
  const hideTooltip = useCallback(() => {
    setTooltip({ visible: false, task: null, x: 0, y: 0 });
  }, []);
  const moveTooltip = useCallback((e) => {
    setTooltip((t) => (t.visible ? { ...t, x: e.clientX, y: e.clientY } : t));
  }, []);

  if (!tasks.length) return null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {VIEW_MODES.map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === v.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Legend */}
          {Object.entries(PRIORITY_COLORS).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: c }} />
              {k === 'low' ? 'Basse' : k === 'medium' ? 'Moyenne' : k === 'high' ? 'Haute' : 'Urgente'}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border-2 border-red-500 bg-red-100" />
            Chemin critique
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex">
          {/* Left: Task labels */}
          <div className="flex-shrink-0 border-r border-border bg-accent/20" style={{ width: LABEL_WIDTH }}>
            {/* Header */}
            <div className="h-10 border-b border-border px-3 flex items-center">
              <span className="text-xs font-semibold text-muted-foreground">Tâches ({tasks.length})</span>
            </div>
            {/* Rows */}
            {tasks.map((task) => {
              const risk = task.risk_score != null ? riskLevel(task.risk_score) : null;
              return (
                <div key={task.id} className="flex items-center gap-2 border-b border-border/50 px-3" style={{ height: ROW_HEIGHT }}>
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: task.status_color || '#6b7280' }} />
                  <span className="flex-1 truncate text-sm text-foreground" title={task.name}>{task.name}</span>
                  {task.is_critical && <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" title="Chemin critique" />}
                  {risk && risk !== 'none' && (
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: RISK_COLORS[risk] }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Chart area */}
          <div className="flex-1 overflow-x-auto" ref={chartRef}>
            <div style={{ width: chartWidth, minWidth: '100%' }}>
              {/* Time headers */}
              <div className="relative h-10 border-b border-border bg-accent/10">
                {timeHeaders.map((h, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-border/40 flex items-center px-2"
                    style={{ left: h.offset * dayPx, width: h.span * dayPx }}
                  >
                    <span className="text-xs text-muted-foreground truncate">{h.label}</span>
                  </div>
                ))}
              </div>

              {/* Bars area */}
              <div className="relative" style={{ height: tasks.length * ROW_HEIGHT }}>
                {/* Grid lines */}
                {timeHeaders.map((h, i) => (
                  <div
                    key={`grid-${i}`}
                    className="absolute top-0 h-full border-l border-border/20"
                    style={{ left: h.offset * dayPx }}
                  />
                ))}

                {/* Today marker */}
                {todayOffset != null && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary/60 z-10"
                    style={{ left: todayOffset }}
                  >
                    <div className="absolute -top-0 -left-2.5 rounded-b bg-primary px-1 py-0.5 text-[9px] font-medium text-primary-foreground">
                      Auj.
                    </div>
                  </div>
                )}

                {/* Dependency arrows */}
                <DependencyLines tasks={tasks} taskMap={taskMap} minDate={minDate} dayPx={dayPx} />

                {/* Task bars */}
                {tasks.map((task, idx) => {
                  if (!task.start || !task.end) return null;
                  const startOffset = daysBetween(minDate, task.start) * dayPx;
                  const duration = Math.max(1, daysBetween(task.start, task.end));
                  const barWidth = duration * dayPx;
                  const barColor = PRIORITY_COLORS[task.priority] || '#6366f1';
                  const isCritical = task.is_critical;
                  const risk = task.risk_score != null ? riskLevel(task.risk_score) : null;

                  return (
                    <div
                      key={task.id}
                      className="absolute flex items-center"
                      style={{ top: idx * ROW_HEIGHT + 6, left: startOffset, width: barWidth, height: ROW_HEIGHT - 12 }}
                      onMouseEnter={(e) => showTooltip(e, task)}
                      onMouseMove={moveTooltip}
                      onMouseLeave={hideTooltip}
                    >
                      {/* Resize handle: start */}
                      {!readOnly && onTaskUpdate && (
                        <div
                          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-20 hover:bg-black/10 rounded-l"
                          onMouseDown={(e) => handleMouseDown(e, task, 'resize-start')}
                        />
                      )}

                      {/* Bar */}
                      <div
                        className={`relative w-full h-full rounded transition-shadow ${!readOnly && onTaskUpdate ? 'cursor-grab active:cursor-grabbing' : ''} ${isCritical ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}
                        style={{
                          backgroundColor: barColor,
                          opacity: task.has_dates === false ? 0.45 : 0.85,
                          border: task.has_dates === false ? '1px dashed currentColor' : 'none',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      >
                        {/* Progress fill */}
                        {task.progress > 0 && (
                          <div
                            className="absolute inset-0 rounded bg-black/20"
                            style={{ width: `${task.progress}%` }}
                          />
                        )}
                        {/* Label */}
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
                          {barWidth > 60 ? `${task.progress}%` : ''}
                        </span>
                        {/* Risk indicator */}
                        {risk && risk !== 'none' && (
                          <div
                            className="absolute -top-1 -right-1 h-3 w-3 rounded-full border border-white"
                            style={{ backgroundColor: RISK_COLORS[risk] }}
                            title={`Risque: ${task.risk_score}%`}
                          />
                        )}
                      </div>

                      {/* Resize handle: end */}
                      {!readOnly && onTaskUpdate && (
                        <div
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-20 hover:bg-black/10 rounded-r"
                          onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip {...tooltip} />

      {/* Workload Panel */}
      {workload && <WorkloadPanel workload={workload} />}

      {/* Critical Path Summary */}
      {criticalPath && criticalPath.critical_path?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-red-500" />
              Chemin critique — {criticalPath.total_duration_days} jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {criticalPath.tasks?.filter((t) => t.is_critical).map((t) => (
                <Badge key={t.task_id} variant="destructive" className="text-xs">
                  {t.title} ({t.duration_days}j, marge: {t.slack}j)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
