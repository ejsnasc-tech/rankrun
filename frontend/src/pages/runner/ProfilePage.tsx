import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

interface ProfileData {
  name: string;
  email: string;
  bio: string | null;
  city: string | null;
  uf: string | null;
  slug: string | null;
  publicProfile: boolean;
  document: string | null;
}

interface MedicalForm {
  allergies?: string;
  conditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [medical, setMedical] = useState<MedicalForm>({});

  useEffect(() => {
    api
      .get<ProfileData>("/me/profile")
      .then((r) => setProfile(r.data))
      .catch(() => setErro("Não foi possível carregar o perfil."))
      .finally(() => setCarregando(false));
  }, []);

  const onSavePublic = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const { data } = await api.put<ProfileData>("/me/profile", {
        bio: profile.bio,
        city: profile.city,
        uf: profile.uf,
        slug: profile.slug ?? undefined,
        publicProfile: profile.publicProfile,
      });
      setProfile((p) => ({ ...p!, ...data }));
      setOkMsg("Perfil público atualizado.");
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const onSaveMedical = async (e: FormEvent) => {
    e.preventDefault();
    await api.put("/me/medical-info", medical);
    setOkMsg("Dados médicos atualizados.");
  };

  const profileUrl = profile?.slug ? `${window.location.origin}/atleta/${profile.slug}` : "";

  const compartilhar = async () => {
    if (!profileUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile?.name ?? "Perfil", url: profileUrl });
        return;
      } catch {
        /* cancelou */
      }
    }
    await navigator.clipboard.writeText(profileUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header area="runner" />
        <main className="mx-auto max-w-2xl px-4 py-8 text-gray-500">Carregando…</main>
      </div>
    );
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Meu perfil</h1>

        {erro && <div className="rounded bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{erro}</div>}
        {okMsg && <div className="rounded bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">{okMsg}</div>}

        {profile && (
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Página pública</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Seu link compartilhável: <span className="font-mono text-orange-600">{profileUrl}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {profile.slug && (
                  <Link
                    to={`/atleta/${profile.slug}`}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Ver minha página →
                  </Link>
                )}
                <button
                  type="button"
                  onClick={compartilhar}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                >
                  {copiado ? "✓ Copiado!" : "🔗 Compartilhar"}
                </button>
              </div>
            </div>

            <form onSubmit={onSavePublic} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Link do perfil (slug)</label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="rounded-l-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">/atleta/</span>
                  <input
                    value={profile.slug ?? ""}
                    onChange={(e) => setProfile({ ...profile, slug: e.target.value })}
                    pattern="[a-z0-9-]+"
                    className="flex-1 rounded-r-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Apenas letras minúsculas, números e hífen.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={profile.bio ?? ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Conte um pouco sobre você como corredor."
                  className={inputCls}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cidade</label>
                  <input
                    value={profile.city ?? ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">UF</label>
                  <input
                    value={profile.uf ?? ""}
                    onChange={(e) => setProfile({ ...profile, uf: e.target.value.toUpperCase() })}
                    maxLength={2}
                    className={`${inputCls} uppercase`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={profile.publicProfile}
                  onChange={(e) => setProfile({ ...profile, publicProfile: e.target.checked })}
                />
                Manter meu perfil público (acessível pelo link)
              </label>

              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar perfil público"}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Dados médicos (privados)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Usados apenas para emergências em provas onde você está inscrito. Nunca aparecem na página pública.
          </p>
          <form onSubmit={onSaveMedical} className="mt-4 space-y-3">
            <input onChange={(e) => setMedical({ ...medical, allergies: e.target.value })} className={inputCls} placeholder="Alergias" />
            <input onChange={(e) => setMedical({ ...medical, conditions: e.target.value })} className={inputCls} placeholder="Condições médicas" />
            <input onChange={(e) => setMedical({ ...medical, emergencyContactName: e.target.value })} className={inputCls} placeholder="Contato de emergência" />
            <input onChange={(e) => setMedical({ ...medical, emergencyContactPhone: e.target.value })} className={inputCls} placeholder="Telefone de emergência" />
            <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
              Salvar
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
