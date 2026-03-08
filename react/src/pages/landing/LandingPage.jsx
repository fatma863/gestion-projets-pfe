import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  FolderKanban, Brain, CalendarRange, Users, BarChart3,
  CheckCircle2, ArrowRight, Zap, Shield, Clock,
} from 'lucide-react';

const features = [
  {
    icon: FolderKanban,
    title: 'Kanban Board',
    description: 'Organisez vos tâches avec un tableau Kanban intuitif. Glissez-déposez pour changer le statut.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: CalendarRange,
    title: 'Diagramme de Gantt',
    description: 'Visualisez la chronologie de vos projets avec un diagramme de Gantt interactif.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Brain,
    title: 'Intelligence Artificielle',
    description: 'Estimation de durée, détection de risques de retard et optimisation des assignations.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Users,
    title: 'Gestion d\'équipes',
    description: 'Créez des équipes, assignez des rôles et gérez les compétences de chaque membre.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Rapports',
    description: 'Tableaux de bord pour suivre la progression, les risques et la productivité.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: Shield,
    title: 'Sécurité & Rôles',
    description: 'Authentification sécurisée, gestion des rôles et permissions granulaires.',
    color: 'bg-cyan-100 text-cyan-600',
  },
];

const stats = [
  { value: 'Kanban', label: 'Gestion visuelle' },
  { value: 'Gantt', label: 'Planification temporelle' },
  { value: 'IA', label: 'Estimations intelligentes' },
  { value: '100%', label: 'Open Source' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
              GP
            </div>
            <span className="text-lg font-bold text-foreground">Gestion Projets</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/register">
              <Button>
                Commencer <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" /> Système Intelligent
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Gérez vos projets{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                intelligemment
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Une plateforme intelligente pour organiser, suivre et optimiser vos projets en équipe — avec Kanban, Gantt, IA et collaboration en temps réel.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="text-base px-8">
                  Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Se connecter
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Des outils puissants pour planifier, suivre et optimiser vos projets
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Comment ça marche ?</h2>
            <p className="mt-4 text-muted-foreground">En 3 étapes simples</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Créez votre projet', desc: 'Définissez le nom, l\'équipe et les dates de votre projet.' },
              { step: '2', title: 'Organisez les tâches', desc: 'Ajoutez des tâches, assignez-les et suivez leur progression.' },
              { step: '3', title: 'Analysez avec l\'IA', desc: 'Obtenez des estimations, détectez les risques et optimisez.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-gray-100 bg-gradient-to-r from-primary to-blue-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Prêt à commencer ?</h2>
          <p className="mt-4 text-blue-100">
            Rejoignez la plateforme et commencez à gérer vos projets efficacement.
          </p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-50 text-base px-8">
                Démarrer maintenant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs">
                GP
              </div>
              <span className="text-sm font-semibold text-foreground">Gestion Projets</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} — Projet de Fin d'Études
            </p>
            <div className="flex gap-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
