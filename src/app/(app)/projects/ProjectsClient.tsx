'use client'

import { useState } from 'react'
import { PROJECT_STATUS_LABELS, formatDate } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'

interface ProjectUpdate {
  id: string
  body: string
  photo_urls: string[]
  created_at: string
  posted_by: { apt_number: string } | null
}

interface ProjectData {
  id: string
  title: string
  description: string | null
  status: string
  projected_cost_eur: number | null
  actual_cost_eur: number | null
  provider_name: string | null
  provider_contact: string | null
  start_date: string | null
  estimated_completion: string | null
  completion_date: string | null
  created_at: string
  updates: ProjectUpdate[]
  origin_proposal_id: string | null
}

const STATUS_STYLE: Record<string, { tag: string; icon: string }> = {
  planning:    { tag: 'tag tag-gray',   icon: '📋' },
  tendering:   { tag: 'tag tag-amber',  icon: '🔍' },
  in_progress: { tag: 'tag tag-green',  icon: '🔨' },
  on_hold:     { tag: 'tag tag-red',    icon: '⏸' },
  completed:   { tag: 'tag tag-blue',   icon: '✅' },
}

function getProgress(status: string): number {
  const map: Record<string, number> = {
    planning: 5, tendering: 20, in_progress: 50, on_hold: 40, completed: 100
  }
  return map[status] || 0
}

export default function ProjectsClient({ projects, profile }: { projects: ProjectData[]; profile: Profile }) {
  const [expandedId, setExpandedId] = useState<string | null>(projects[0]?.id || null)
  const isAdmin = profile.role === 'admin' || profile.role === 'sa'

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--txm)' }}>
          Active initiatives — proposals that became real projects
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm">+ New project</button>
        )}
      </div>

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txl)', fontSize: '13px' }}>
          No active projects yet. Approved proposals can be promoted to projects by the community admin.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {projects.map(project => {
          const statusStyle = STATUS_STYLE[project.status] || STATUS_STYLE.planning
          const progress = getProgress(project.status)
          const isExpanded = expandedId === project.id
          const latestUpdate = project.updates?.[0]

          return (
            <div key={project.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Header — always visible */}
              <button
                style={{ width: '100%', textAlign: 'left', padding: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className={statusStyle.tag}>
                        {statusStyle.icon} {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                      {project.origin_proposal_id && (
                        <span style={{ fontSize: '11px', color: 'var(--txl)' }}>From proposal</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)', marginBottom: '6px' }}>
                      {project.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--txm)' }}>
                      {project.projected_cost_eur && (
                        <span>
                          Est. <strong style={{ color: 'var(--tx)' }}>€{project.projected_cost_eur.toLocaleString()}</strong>
                          {project.actual_cost_eur ? ` · Spent €${project.actual_cost_eur.toLocaleString()}` : ''}
                        </span>
                      )}
                      {project.estimated_completion && (
                        <span>Est. completion <strong style={{ color: 'var(--tx)' }}>{formatDate(project.estimated_completion)}</strong></span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--txl)', fontSize: '12px' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '12px' }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--txl)', marginTop: '4px' }}>
                    {progress}% — {PROJECT_STATUS_LABELS[project.status]}
                  </div>
                </div>

                {/* Latest update preview */}
                {latestUpdate && !isExpanded && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--txm)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Latest: {latestUpdate.body}
                  </div>
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--br)' }}>
                  {project.description && (
                    <p style={{ fontSize: '11px', color: 'var(--txm)', marginBottom: '12px', lineHeight: 1.5 }}>
                      {project.description}
                    </p>
                  )}

                  {/* Cost breakdown */}
                  {(project.projected_cost_eur || project.actual_cost_eur) && (
                    <div className="three-col" style={{ marginBottom: '16px' }}>
                      {[
                        { label: 'Projected', value: project.projected_cost_eur },
                        { label: 'Actual to date', value: project.actual_cost_eur },
                        { label: 'Quotes', value: null },
                      ].map(item => (
                        <div key={item.label} style={{ borderRadius: '8px', padding: '8px', textAlign: 'center', background: 'var(--sand-d)' }}>
                          <div style={{ fontSize: '9px', color: 'var(--txl)', marginBottom: '2px' }}>{item.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tx)' }}>
                            {item.value ? `€${item.value.toLocaleString()}` : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Provider */}
                  {project.provider_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '11px', color: 'var(--txm)' }}>
                      <span style={{ fontWeight: 500, color: 'var(--tx)' }}>Provider:</span>
                      {project.provider_name}
                      {project.provider_contact && (
                        <span style={{ color: 'var(--txl)' }}>· {project.provider_contact}</span>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  {(project.start_date || project.estimated_completion) && (
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '11px', color: 'var(--txm)' }}>
                      {project.start_date && (
                        <span><span style={{ fontWeight: 500 }}>Started:</span> {formatDate(project.start_date)}</span>
                      )}
                      {project.estimated_completion && (
                        <span><span style={{ fontWeight: 500 }}>Est. completion:</span> {formatDate(project.estimated_completion)}</span>
                      )}
                      {project.completion_date && (
                        <span style={{ color: '#166534' }}><span style={{ fontWeight: 500 }}>Completed:</span> {formatDate(project.completion_date)}</span>
                      )}
                    </div>
                  )}

                  {/* Updates */}
                  {project.updates && project.updates.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx)', marginBottom: '8px' }}>Progress updates</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {project.updates.map(update => (
                          <div key={update.id} style={{
                            borderRadius: '12px', padding: '12px', fontSize: '11px',
                            background: 'rgba(26,61,43,0.04)', border: '1px solid rgba(26,61,43,0.08)',
                          }}>
                            <div style={{ color: 'var(--txm)', marginBottom: '4px', lineHeight: 1.5 }}>{update.body}</div>
                            {update.photo_urls && update.photo_urls.length > 0 && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                {update.photo_urls.map((url, i) => (
                                  <img key={i} src={url} alt={`Update photo ${i + 1}`}
                                    style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--br)' }} />
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: '9px', color: 'var(--txl)', marginTop: '4px' }}>
                              {update.posted_by ? `Admin @${update.posted_by.apt_number}` : 'Admin'} · {formatDate(update.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin actions */}
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm" style={{ flex: 1, border: '1px dashed var(--br)' }}>
                        📷 Add status photo
                      </button>
                      <button className="btn btn-sm" style={{ flex: 1, border: '1px dashed var(--br)' }}>
                        📝 Post update
                      </button>
                      <button className="btn btn-sm" style={{ padding: '4px 12px' }}>
                        📎 Contract
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
