import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMyProfile } from '@tour/core'
import {
  CalendarRange,
  Check,
  ChevronRight,
  Database,
  LogOut,
  Pencil,
  ShieldCheck,
  Store,
  Inbox,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Chip'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { FullScreenSpinner } from '../../components/ui/Spinner'
import { client } from '../../lib/firebase'
import { errorMessage } from '../../lib/errorMessage'
import { MY_SUBMISSIONS_ANCHOR, initialsOf } from '../venues/venueForm'
type RenameVars = { userId: string; displayName: string }

const NAME_MIN = 2
const NAME_MAX = 80

function validateName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim()
  if (value.length < NAME_MIN) return { ok: false, error: 'O nome precisa ter pelo menos 2 caracteres.' }
  if (value.length > NAME_MAX) return { ok: false, error: 'O nome pode ter no máximo 80 caracteres.' }
  return { ok: true, value }
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-surface-3"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600/20 text-xl font-semibold text-brand-200 ring-1 ring-brand-900"
    >
      {initialsOf(name)}
    </span>
  )
}

function QuickLink({ to, icon: Icon, label, description }: { to: string; icon: LucideIcon; label: string; description: string }) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block truncate text-xs text-ink-muted">{description}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      </Link>
    </li>
  )
}

export default function ProfilePage() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const rename = useMutation({
    mutationFn: ({ userId, displayName }: RenameVars) => updateMyProfile(client, userId, { displayName }),
    onSuccess: async (_result, { userId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
      setEditing(false)
    },
  })

  if (!user) return <FullScreenSpinner label="Carregando…" />
  const userId = user.id
  const displayName = profile?.displayName ?? user.displayName ?? ''
  const avatarUrl = profile?.avatarUrl ?? user.avatarUrl

  function startEditing() {
    setDraft(displayName)
    setNameError(null)
    rename.reset()
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setNameError(null)
    rename.reset()
  }

  function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const checked = validateName(draft)
    if (!checked.ok) {
      setNameError(checked.error)
      return
    }
    setNameError(null)
    if (checked.value === displayName) {
      setEditing(false)
      return
    }
    rename.mutate({ userId, displayName: checked.value })
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      setSignOutError(errorMessage(e, 'Não deu para sair. Tente de novo.'))
      setSigningOut(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">Perfil</h1>
          <p className="text-sm text-ink-muted">Sua conta no Tour App.</p>
        </header>

        <div className="space-y-4">
          <Card className="flex items-start gap-4">
            <Avatar url={avatarUrl} name={displayName || (user.email ?? '')} />
            <div className="min-w-0 flex-1 space-y-2">
              {editing ? (
                <form onSubmit={saveName} noValidate className="space-y-2">
                  <Input
                    label="Nome de exibição"
                    value={draft}
                    autoFocus
                    maxLength={NAME_MAX}
                    disabled={rename.isPending}
                    onChange={(e) => {
                      setDraft(e.target.value)
                      setNameError(null)
                    }}
                    error={nameError ?? (rename.isError ? errorMessage(rename.error, 'Não deu para salvar o nome.') : null)}
                    hint="Como as outras pessoas da turnê veem você."
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={rename.isPending}>
                      <Check className="h-4 w-4" aria-hidden />
                      {rename.isPending ? 'Salvando…' : 'Salvar'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={rename.isPending} onClick={cancelEditing}>
                      <X className="h-4 w-4" aria-hidden />
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 truncate text-lg font-semibold">{displayName || 'Sem nome'}</h2>
                  <button
                    type="button"
                    onClick={startEditing}
                    aria-label="Editar nome"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  {isAdmin && (
                    <Badge className="bg-brand-600/20 text-brand-100">
                      <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
                      Administrador
                    </Badge>
                  )}
                </div>
              )}
              <p className="truncate text-sm text-ink-muted">{user.email ?? 'Sem e-mail'}</p>
              <p className="text-xs text-ink-muted">Login com Google. Nome e foto vêm da sua conta Google; o nome você pode trocar aqui.</p>
            </div>
          </Card>

          {isAdmin && (
            <Card className="space-y-3">
              <SectionTitle>Administração</SectionTitle>
              <ul className="-mx-3 divide-y divide-surface-2">
                <QuickLink to="/admin/moderacao" icon={ShieldCheck} label="Moderação" description="Aprovar ou recusar casas sugeridas" />
                <QuickLink to="/admin/importar" icon={Database} label="Importar dados de exemplo" description="Cidades, casas, produtoras e bandas" />
              </ul>
            </Card>
          )}

          <Card className="space-y-3">
            <SectionTitle>Atalhos</SectionTitle>
            <ul className="-mx-3 divide-y divide-surface-2">
              <QuickLink to="/turnes" icon={CalendarRange} label="Minhas turnês" description="Turnês que você criou ou participa" />
              <QuickLink to="/casas/sugerir" icon={Store} label="Sugerir uma casa" description="Indique um lugar que recebe show" />
              <QuickLink
                to={`/casas/sugerir#${MY_SUBMISSIONS_ANCHOR}`}
                icon={Inbox}
                label="Minhas sugestões"
                description="Status das casas que você indicou"
              />
            </ul>
          </Card>

          <Card className="space-y-2">
            <SectionTitle>Privacidade dos contatos</SectionTitle>
            <p className="text-sm text-ink-muted">
              Telefones, e-mails e redes de casas, produtoras e bandas aparecem para qualquer pessoa logada. Use-os só para
              marcar shows — nada de listas de divulgação, spam ou repasse para fora do app.
            </p>
          </Card>

          {!isAdmin && (
            <Card className="space-y-2">
              <SectionTitle>Para quem cuida do projeto</SectionTitle>
              <p className="text-sm text-ink-muted">
                Não existe botão para virar admin. No console do Firebase, abra o Firestore, encontre o documento{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs text-ink">profiles/{userId}</code> e mude o campo{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs text-ink">role</code> para{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs text-ink">admin</code>. Depois, saia e entre de novo.
              </p>
            </Card>
          )}

          <Card className="space-y-3">
            <Button variant="secondary" className="w-full md:w-auto" onClick={() => void handleSignOut()} disabled={signingOut}>
              <LogOut className="h-4 w-4" aria-hidden />
              {signingOut ? 'Saindo…' : 'Sair'}
            </Button>
            {signOutError && (
              <p className="text-sm text-red-400" role="alert">
                {signOutError}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
