import { Star } from 'lucide-react'
import type { AppItem } from '../types'

export default function AppTile({ app, onOpen, favorite, onFavorite }: { app: AppItem; onOpen: (app: AppItem) => void; favorite: boolean; onFavorite: (id: string) => void }) {
  const Icon = app.icon
  return <div className="app-tile-wrap">
    <button className="app-tile" onClick={() => onOpen(app)}>
      <span className="app-icon" style={{ background: app.color }}><Icon size={23} strokeWidth={1.8} /></span>
      <span className="app-tile-name">{app.name}</span>
      <span className="app-tile-sub">{app.subtitle}</span>
    </button>
    <button className={'favorite-toggle ' + (favorite ? 'is-favorite' : '')} aria-label="Toggle favorite" onClick={() => onFavorite(app.id)}><Star size={13} fill={favorite ? 'currentColor' : 'none'} /></button>
  </div>
}
