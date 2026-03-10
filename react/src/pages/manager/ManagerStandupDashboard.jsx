import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useStandups } from '../../hooks/useStandups';
import { useSprint } from '../../hooks/useSprints';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import { MessageSquare, Calendar, User, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ManagerStandupDashboard() {
  const { sprintId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [dateFilter, setDateFilter] = useState('');

  const { data: sprint } = useSprint(sprintId);
  const { data: standups, isLoading } = useStandups(sprintId, dateFilter);

  // Group standups by date
  const grouped = (standups || []).reduce((acc, s) => {
    const date = s.created_at?.slice(0, 10) || 'Inconnu';
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Standups — ${sprint?.name || 'Sprint'}`}
        description="Aperçu des rapports quotidiens de l'équipe"
        back
      />

      <div className="flex items-center gap-3">
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" />
        {dateFilter && (
          <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>Effacer</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !standups?.length ? (
        <EmptyState icon={MessageSquare} title="Aucun standup" description={dateFilter ? 'Aucun rapport pour cette date' : 'Aucun rapport soumis pour ce sprint'} />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                <Badge variant="outline">{grouped[date].length} rapport(s)</Badge>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[date].map((report, i) => (
                  <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="h-full">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Avatar name={report.user?.name} src={report.user?.avatar} size="sm" />
                          <span className="text-sm font-semibold">{report.user?.name || 'Utilisateur'}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="font-medium text-emerald-700 flex items-center gap-1 mb-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Hier
                            </p>
                            <p className="text-muted-foreground whitespace-pre-line">{report.yesterday}</p>
                          </div>
                          <div>
                            <p className="font-medium text-blue-700 flex items-center gap-1 mb-0.5">
                              <ArrowRight className="h-3.5 w-3.5" /> Aujourd'hui
                            </p>
                            <p className="text-muted-foreground whitespace-pre-line">{report.today}</p>
                          </div>
                          {report.blockers && (
                            <div>
                              <p className="font-medium text-red-700 flex items-center gap-1 mb-0.5">
                                <AlertTriangle className="h-3.5 w-3.5" /> Blocages
                              </p>
                              <p className="text-muted-foreground whitespace-pre-line">{report.blockers}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
