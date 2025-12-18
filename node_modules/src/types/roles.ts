export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CHEF: 'chef',
  CLIENT: 'client'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface RolePermissions {
  canCreateAdmins: boolean;
  canCreateClients: boolean;
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  canViewDashboard: boolean;
  canManageProjects: boolean;
  canManageMaterials: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    canCreateAdmins: true,
    canCreateClients: true,
    canManageUsers: true,
    canDeleteUsers: true,
    canViewDashboard: true,
    canManageProjects: true,
    canManageMaterials: true,
    canManageSettings: true,
  },
  [UserRole.ADMIN]: {
    canCreateAdmins: false,
    canCreateClients: true,
    canManageUsers: true,
    canDeleteUsers: false,
    canViewDashboard: true,
    canManageProjects: true,
    canManageMaterials: true,
    canManageSettings: false,
  },
  [UserRole.CHEF]: {
    canCreateAdmins: false,
    canCreateClients: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canViewDashboard: true,
    canManageProjects: true,
    canManageMaterials: true,
    canManageSettings: false,
  },
  [UserRole.CLIENT]: {
    canCreateAdmins: false,
    canCreateClients: false,
    canManageUsers: false,
    canDeleteUsers: false,
    canViewDashboard: true,
    canManageProjects: false,
    canManageMaterials: false,
    canManageSettings: false,
  },
};

export const getRolePermissions = (role: UserRole): RolePermissions => {
  return ROLE_PERMISSIONS[role];
};

export const canUserPerformAction = (
  userRole: UserRole,
  action: keyof RolePermissions
): boolean => {
  return ROLE_PERMISSIONS[userRole][action];
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Administrateur',
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.CHEF]: 'Chef de Chantier',
  [UserRole.CLIENT]: 'Client',
};

export const getRoleLabel = (role: UserRole): string => {
  return ROLE_LABELS[role];
};