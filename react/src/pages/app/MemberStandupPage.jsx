import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useStandups, useSubmitStandup, useMyStandupStatus } from '../../hooks/useStandups';
import { useSprint } from '../../hooks/useSprints';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle2, ArrowRight, AlertTriangle, Send, Calendar } from 'lucide-react';

export default function MemberStandupPage() {
  const { sprintId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  const { data: sprint } = useSprint(sprintId);
  const { data: statusData, isLoading: statusLoading } = useMyStandupStatus(sprintId);
  const { data: standups, isLoading: standupsLoading } = useStandups(sprintId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Standups — ${sprint?.name || 'Sprint'}`}
        description="Partagez votre avancement quotidien"
        back
      />

      {/* Standup Form */}
      <StandupForm sprintId={sprintId} existing={statusData} isLoading={statusLoading} />

      {/* Previous standups */}
      <Card>
        <CardHeader>
          <CardTitle>Rapports de l'équipe</CardTitle>
        </CardHeader>
        <CardContent>
          {standupsLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !standups?.length ? (
            <EmptyState icon={MessageSquare} title="Aucun rapport" description="Soyez le premier à soumettre votre standup !" />
          ) : (
            <div className="space-y-3">
              {standups.map((report, i) => (
                <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={report.user?.name} src={report.user?.avatar} size="xs" />
                      <span className="text-sm font-semibold">{report.user?.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(report.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <p><span className="font-medium text-emerald-700">Hier : </span><span className="text-muted-foreground">{report.yesterday}</span></p>
                    <p><span className="font-medium text-blue-700">Aujourd'hui : </span><span className="text-muted-foreground">{report.today}</span></p>
                    {report.blockers && (
                      <p><span className="font-medium text-red-700">Blocages : </span><span className="text-muted-foreground">{report.blockers}</span></p>
                    )}
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

function StandupForm({ sprintId, existing, isLoading }) {
  const [form, setForm] = useState({ yesterday: '', today: '', blockers: '' });
  const [errors, setErrors] = useState({});
  const submitMutation = useSubmitStandup(sprintId);

  const alreadySubmitted = existing?.submitted;
  const existingReport = existing?.standup;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    submitMutation.mutate(form, {
      onSuccess: () => setForm({ yesterday: '', today: '', blockers: '' }),
      onError: (err) => {
        if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      },
    });
  };

  if (isLoading) return <Card><CardContent className="py-10 flex justify-center"><Spinner /></CardContent></Card>;

  if (alreadySubmitted && !submitMutation.isSuccess) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-emerald-700 mb-3">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Standup soumis aujourd'hui</span>
          </div>
          {existingReport && (
            <div className="space-y-1.5 text-sm">
              <p><span className="font-medium">Hier : </span>{existingReport.yesterday}</p>
              <p><span className="font-medium">Aujourd'hui : </span>{existingReport.today}</p>
              {existingReport.blockers && <p><span className="font-medium">Blocages : </span>{existingReport.blockers}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" /> Mon standup du jour
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Qu'avez-vous fait hier ? *
            </label>
            <Textarea value={form.yesterday} onChange={(e) => setForm((f) => ({ ...f, yesterday: e.target.value }))} rows={3} placeholder="Décrivez ce que vous avez accompli..." />
            {errors.yesterday && <p className="mt-1 text-xs text-destructive">{errors.yesterday[0]}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-blue-700 flex items-center gap-1">
              <ArrowRight className="h-4 w-4" /> Que ferez-vous aujourd'hui ? *
            </label>
            <Textarea value={form.today} onChange={(e) => setForm((f) => ({ ...f, today: e.target.value }))} rows={3} placeholder="Décrivez vos objectifs du jour..." />
            {errors.today && <p className="mt-1 text-xs text-destructive">{errors.today[0]}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Blocages (optionnel)
            </label>
            <Textarea value={form.blockers} onChange={(e) => setForm((f) => ({ ...f, blockers: e.target.value }))} rows={2} placeholder="Y a-t-il des obstacles ?" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Envoi...' : 'Soumettre'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
