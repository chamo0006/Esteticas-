import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Shield, Users, CheckCircle, XCircle, Inbox, Mail, Phone } from 'lucide-react';

interface Props {
  searchParams: Promise<{ secret?: string }>;
}

export default async function SuperAdminPage({ searchParams }: Props) {
  const { secret } = await searchParams;

  // Protección simple con secret de env var
  if (!process.env.SUPERADMIN_SECRET || secret !== process.env.SUPERADMIN_SECRET) {
    redirect('/');
  }

  // Fetch all tenants with their related counts
  const { data: tenantsData } = await supabase
    .from('tenants')
    .select(`
      id,
      slug,
      nombre,
      email_contacto,
      telefono,
      activo,
      created_at,
      usuarios_admin(id, activo),
      servicios(id, activo),
      turnos(id)
    `)
    .order('created_at', { ascending: false });

  // Fetch leads
  const { data: leadsData } = await supabase
    .from('leads')
    .select('id, nombre, email, telefono, estetica, created_at')
    .order('created_at', { ascending: false });

  const leads = leadsData ?? [];

  // Fetch global counts
  const [
    { count: totalTenants },
    { count: activosTenants },
    { count: totalTurnos },
    { count: totalClientes },
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('turnos').select('*', { count: 'exact', head: true }),
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
  ]);

  const stats = {
    total_tenants: totalTenants ?? 0,
    activos: activosTenants ?? 0,
    total_turnos: totalTurnos ?? 0,
    total_clientes: totalClientes ?? 0,
  };

  const tenants = (tenantsData ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    nombre: t.nombre,
    email_contacto: t.email_contacto,
    telefono: t.telefono,
    activo: t.activo,
    created_at: t.created_at,
    admins: (t.usuarios_admin as { id: string; activo: boolean }[])?.filter((u) => u.activo).length ?? 0,
    servicios: (t.servicios as { id: string; activo: boolean }[])?.filter((s) => s.activo).length ?? 0,
    total_turnos: (t.turnos as { id: string }[])?.length ?? 0,
  }));

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('es-AR');

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Super Admin</h1>
            <p className="text-zinc-400 text-xs">Panel de gestión de la plataforma</p>
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Estéticas', value: stats.total_tenants },
            { label: 'Activas', value: stats.activos },
            { label: 'Turnos totales', value: stats.total_turnos },
            { label: 'Clientes totales', value: stats.total_clientes },
            { label: 'Leads', value: leads.length },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabla de leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-white text-sm">Leads — Landing principal</h2>
            </div>
            <span className="text-xs text-zinc-500">{leads.length} registros</span>
          </div>
          {leads.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Todavía no hay leads registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    {['Nombre','Email','Teléfono','Estética','Fecha'].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">{l.nombre}</td>
                      <td className="px-5 py-3">
                        {l.email
                          ? <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs"><Mail className="w-3 h-3" />{l.email}</a>
                          : <span className="text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        {l.telefono
                          ? <span className="flex items-center gap-1.5 text-zinc-300 text-xs"><Phone className="w-3 h-3" />{l.telefono}</span>
                          : <span className="text-zinc-600">—</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-zinc-400 text-xs">{l.estetica ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">{formatDate(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tabla de tenants */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h2 className="font-semibold text-white text-sm">Estéticas registradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  {['Estética','Slug','Email','Turnos','Servicios','Estado','Registrada'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-white">{t.nombre}</td>
                    <td className="px-5 py-3">
                      <code className="text-violet-400 text-xs bg-violet-900/30 px-2 py-0.5 rounded-md">{t.slug}</code>
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">{t.email_contacto}</td>
                    <td className="px-5 py-3 text-zinc-300">{t.total_turnos}</td>
                    <td className="px-5 py-3 text-zinc-300">{t.servicios}</td>
                    <td className="px-5 py-3">
                      {t.activo
                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" /> Activa</span>
                        : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Inactiva</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
