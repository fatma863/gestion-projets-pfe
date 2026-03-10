import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useGenerateScrum, useBacklogItems, useDeleteBacklogItem } from '../../hooks/useScrumGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Layers, ChevronDown, ChevronRight, ListTodo,
  Target, Calendar, Trash2, Zap, BookOpen, ArrowRight,
} from 'lucide-react';

const PRIORITY_LABELS = { 1: 'Basse', 2: 'Moyenne', 3: 'Haute', 4: 'Haute', 5: 'Urgente' };
const PRIORITY_COLORS = { 1: 'secondary', 2: 'info', 3: 'warning', 4: 'warning', 5: 'destructive' };
const STATUS_COLORS = { open: 'secondary', in_progress: 'info', done: 'success' };
const STATUS_LABELS = { open: 'Ouvert', in_progress: 'En cours', done: 'Terminé' };

export default function ManagerScrumGeneratorPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [expandedEpics, setExpandedEpics] = useState({});

  const { data: projects } = useQuery({
    queryKey: ['projects-for-scrum-gen'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const generateMutation = useGenerateScrum(selectedProject);
  const { data: backlogItems, isLoading: loadingItems } = useBacklogItems(selectedProject);
  const deleteMutation = useDeleteBacklogItem();

  const selectedProjectData = projects?.find((p) => String(p.id) === String(selectedProject));

  const handleGenerate = () => {
    if (!selectedProject) return;
    generateMutation.mutate({ description }, {
      onSuccess: (data) => {
        setResult(data);
        setDescription('');
        // Auto-expand first epic
        if (data?.epics?.length) {
          setExpandedEpics({ [data.epics[0].id]: true });
        }
      },
    });
  };

  const toggleEpic = (id) => setExpandedEpics((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Supprimer cet élément du backlog ?')) {
      deleteMutation.mutate(itemId);
    }
  };

  const displayItems = result?.epics || backlogItems;
  const displaySprints = result?.sprints;
  const summary = result?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Générateur Scrum IA"
        description="Générez automatiquement une structure Scrum complète avec l'IA"
        back
      />

      {/* Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer la structure Scrum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet *</label>
            <Select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setResult(null); }}>
              <option value="">Sélectionner un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>

          {selectedProject && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description du projet <span className="text-muted-foreground">(optionnel — aide l'IA)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Ex: Application de gestion de projets avec kanban, équipes, sprints, notifications et IA..."
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleGenerate} disabled={generateMutation.isPending} size="lg">
                  {generateMutation.isPending ? (
                    <><Spinner size="sm" className="mr-2" /> Génération en cours...</>
                  ) : (
                    <><Zap className="mr-2 h-4 w-4" /> Générer la structure Scrum</>
                  )}
                </Button>
                {selectedProjectData && (
                  <span className="text-sm text-muted-foreground">
                    Projet : <strong>{selectedProjectData.name}</strong>
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Generation Result Summary */}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.epics_count}</p>
                  <p className="text-xs text-muted-foreground">Epics</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.stories_count}</p>
                  <p className="text-xs text-muted-foreground">User Stories</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <ListTodo className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.tasks_count}</p>
                  <p className="text-xs text-muted-foreground">Tâches</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.sprints_count}</p>
                  <p className="text-xs text-muted-foreground">Sprints</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Generated Sprints */}
      {displaySprints?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Sprints générés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displaySprints.map((sprint, i) => (
                <motion.div key={sprint.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{sprint.name}</span>
                        <Badge variant={sprint.status === 'active' ? 'success' : 'secondary'}>
                          {sprint.status === 'active' ? 'Actif' : 'Planifié'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{sprint.tasks_count} tâches</span>
                      </div>
                      {sprint.goal && <p className="text-sm text-muted-foreground line-clamp-1">{sprint.goal}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{sprint.start_date} → {sprint.end_date}</p>
                    </div>
                    <Link to={`/manager/sprints/${sprint.id}?project=${selectedProject}`}>
                      <Button variant="outline" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backlog Items (Epics → Stories → Tasks) */}
      {selectedProject && !loadingItems && displayItems?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Product Backlog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {displayItems.map((epic, i) => (
                  <motion.div
                    key={epic.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    {/* Epic header */}
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 bg-accent/30 hover:bg-accent/50 transition-colors"
                      onClick={() => toggleEpic(epic.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedEpics[epic.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Badge variant="outline" className="text-[10px] font-bold">EPIC</Badge>
                        <span className="font-semibold">{epic.title}</span>
                        <Badge variant={STATUS_COLORS[epic.status]} className="text-[10px]">
                          {STATUS_LABELS[epic.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{epic.children?.length || 0} stories</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(epic.id); }}
                          className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stories and tasks */}
                    <AnimatePresence>
                      {expandedEpics[epic.id] && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {epic.description && (
                            <p className="px-4 py-2 text-sm text-muted-foreground bg-accent/10 border-b border-border">
                              {epic.description}
                            </p>
                          )}
                          <div className="divide-y divide-border">
                            {epic.children?.map((story) => (
                              <div key={story.id} className="p-4 pl-8">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-[9px]">STORY</Badge>
                                  <span className="text-sm font-medium">{story.title}</span>
                                  {story.story_points && (
                                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{story.story_points} pts</span>
                                  )}
                                </div>
                                {story.description && (
                                  <p className="text-xs text-muted-foreground mb-2 ml-14">{story.description}</p>
                                )}
                                {/* Story's tasks */}
                                {story.tasks?.length > 0 && (
                                  <div className="ml-14 space-y-1.5">
                                    {story.tasks.map((task) => (
                                      <div key={task.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                        <span className="flex-1 font-medium">{task.title}</span>
                                        {task.priority && (
                                          <Badge variant={PRIORITY_COLORS[task.priority] || 'secondary'} className="text-[9px]">
                                            {task.priority}
                                          </Badge>
                                        )}
                                        {task.story_points && (
                                          <span className="text-muted-foreground bg-background px-1 py-0.5 rounded text-[10px]">
                                            {task.story_points} pts
                                          </span>
                                        )}
                                        {task.status && (
                                          <span className="flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.status.color || '#94a3b8' }} />
                                            <span className="text-muted-foreground">{task.status.name}</span>
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {selectedProject && !loadingItems && !displayItems?.length && !generateMutation.isPending && (
        <EmptyState
          icon={Sparkles}
          title="Aucune structure Scrum"
          description="Utilisez le générateur ci-dessus pour créer automatiquement des epics, stories, tâches et sprints"
        />
      )}

      {loadingItems && (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      )}
    </div>
  );
}
