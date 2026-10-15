import { Briefcase, Cpu, Landmark, Leaf, Newspaper, TrendingUp, Users, type LucideIcon, type LucideProps } from 'lucide-react'

/** Each sector's icon. Sectors are told apart by icon and name, never by colour alone. */
const SECTOR_ICON: Record<string, LucideIcon> = {
  economy: TrendingUp,
  geopolitics: Landmark,
  technology: Cpu,
  business: Briefcase,
  society: Users,
  environment: Leaf,
}

export function SectorIcon({ sector, size = 14, ...rest }: { sector?: string | null } & LucideProps) {
  const Icon = (sector && SECTOR_ICON[sector]) || Newspaper
  return <Icon size={size} strokeWidth={2} aria-hidden="true" focusable="false" {...rest} />
}
