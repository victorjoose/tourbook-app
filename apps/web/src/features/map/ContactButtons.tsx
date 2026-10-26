import { whatsappUrl } from '@tour/core'
import { AtSign, Globe, Mail, MessageCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { instagramHandle, instagramUrl, websiteLabel, websiteUrl } from './filtering'

/** Anchor styled like the secondary <Button>; external links open in a new tab. */
export function ExternalLinkButton({
  href,
  icon: Icon,
  children,
  className,
  external = true,
}: {
  href: string
  icon: LucideIcon
  children: ReactNode
  className?: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </a>
  )
}

export type ContactButtonsProps = {
  phone?: string | null
  email?: string | null
  instagram?: string | null
  website?: string | null
  className?: string
}

/** WhatsApp, e-mail, Instagram and website actions; shows a note when there is no contact. */
export function ContactButtons({ phone, email, instagram, website, className }: ContactButtonsProps) {
  const items: ReactNode[] = []
  if (phone?.trim()) {
    items.push(
      <ExternalLinkButton key="wa" href={whatsappUrl(phone)} icon={MessageCircle}>
        WhatsApp
      </ExternalLinkButton>,
    )
  }
  if (email?.trim()) {
    items.push(
      <ExternalLinkButton key="mail" href={`mailto:${email.trim()}`} icon={Mail} external={false}>
        E-mail
      </ExternalLinkButton>,
    )
  }
  if (instagram?.trim()) {
    items.push(
      <ExternalLinkButton key="ig" href={instagramUrl(instagram)} icon={AtSign}>
        {instagramHandle(instagram)}
      </ExternalLinkButton>,
    )
  }
  if (website?.trim()) {
    items.push(
      <ExternalLinkButton key="web" href={websiteUrl(website)} icon={Globe}>
        {websiteLabel(website)}
      </ExternalLinkButton>,
    )
  }
  if (items.length === 0) {
    return <p className={cn('text-sm text-ink-muted', className)}>Nenhum contato cadastrado.</p>
  }
  return <div className={cn('flex flex-wrap gap-2', className)}>{items}</div>
}
