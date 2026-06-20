import type { Collaborator } from '@/hooks/usePresence'

interface Props {
  collaborators: Collaborator[]
  size?: number
}

export default function CollaboratorAvatars({ collaborators, size = 28 }: Props) {
  if (collaborators.length === 0) return null

  return (
    <div className="collaborator-avatars" title={`${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''} online`}>
      {collaborators.slice(0, 5).map(c => (
        <div
          key={c.clientId}
          className="avatar"
          style={{
            width:       size,
            height:      size,
            background:  c.color,
            fontSize:    size * 0.38,
            border:      `2px solid var(--bg)`,
          }}
          title={`${c.name}${c.latencyMs !== null ? ` · ${c.latencyMs}ms` : ''}`}
        >
          {c.avatarUrl
            ? <img src={c.avatarUrl} alt={c.name} />
            : c.name.charAt(0).toUpperCase()
          }
        </div>
      ))}

      {collaborators.length > 5 && (
        <div
          className="avatar"
          style={{
            width:      size,
            height:     size,
            background: 'var(--surface-4)',
            color:      'var(--text-muted)',
            fontSize:   size * 0.35,
          }}
        >
          +{collaborators.length - 5}
        </div>
      )}
    </div>
  )
}
