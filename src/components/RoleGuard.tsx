import React from 'react';
import { useAuthStore } from '../store/authStore';
import { UserRole, canUserPerformAction } from '../types/roles';
import type { RolePermissions } from '../types/roles';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: keyof RolePermissions;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  fallback = null
}) => {
  const { userData } = useAuthStore();

  // Si pas d'utilisateur connecté, ne pas afficher
  if (!userData) {
    return <>{fallback}</>;
  }

  // Vérification par rôles autorisés
  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <>{fallback}</>;
  }

  // Vérification par permission spécifique
  if (requiredPermission && !canUserPerformAction(userData.role, requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook personnalisé pour vérifier les permissions
export const usePermissions = () => {
  const { userData } = useAuthStore();

  const hasRole = (role: UserRole): boolean => {
    return userData?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return userData ? roles.includes(userData.role) : false;
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return userData ? canUserPerformAction(userData.role, permission) : false;
  };

  const isSuperAdmin = (): boolean => {
    return userData?.role === UserRole.SUPER_ADMIN;
  };

  const isAdmin = (): boolean => {
    return userData?.role === UserRole.ADMIN || userData?.role === UserRole.SUPER_ADMIN;
  };

  const isClient = (): boolean => {
    return userData?.role === UserRole.CLIENT;
  };

  return {
    hasRole,
    hasAnyRole,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    isClient,
    userRole: userData?.role
  };
};