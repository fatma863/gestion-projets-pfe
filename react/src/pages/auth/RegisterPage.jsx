import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { FolderKanban } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.password_confirmation);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: [err.response?.data?.message || 'Erreur d\'inscription'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderKanban size={24} />
          </div>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>
            Rejoignez la plateforme de gestion de projets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.general[0]}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom complet</label>
              <Input placeholder="Votre nom" value={form.name} onChange={update('name')} required />
              {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" placeholder="votre@email.com" value={form.email} onChange={update('email')} required />
              {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required />
              {errors.password && <p className="text-xs text-destructive">{errors.password[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
              <Input type="password" placeholder="••••••••" value={form.password_confirmation} onChange={update('password_confirmation')} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" className="text-white" /> : 'S\'inscrire'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
