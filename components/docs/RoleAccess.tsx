import React from 'react'
import { RoleBadge, Role } from './RoleBadge'

interface RoleAccessProps {
  roles: Role[]
  children?: React.ReactNode
}

export function RoleAccess({ roles, children }: RoleAccessProps) {
  return (
    <div className={children ? '' : 'mb-8'}>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-8 flex items-center gap-2 flex-wrap">
        <span className="text-13 text-slate-600 font-medium">This section applies to:</span>
        <div className="flex gap-1.5 flex-wrap">
          {roles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
