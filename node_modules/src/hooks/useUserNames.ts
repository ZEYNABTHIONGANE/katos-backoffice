import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { FirebaseUser } from '../types/firebase';

interface UserNamesCache {
  [uid: string]: string;
}

export const useUserNames = (userIds: string[]) => {
  const [userNames, setUserNames] = useState<UserNamesCache>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userIds.length === 0) {
      setLoading(false);
      return;
    }

    const loadUserNames = async () => {
      setLoading(true);
      const newUserNames: UserNamesCache = { ...userNames };

      // Récupérer les noms des utilisateurs qui ne sont pas encore en cache
      const missingUserIds = userIds.filter(uid => !newUserNames[uid]);

      if (missingUserIds.length > 0) {
        try {
          const userPromises = missingUserIds.map(uid =>
            userService.getUserByUid(uid)
          );

          const users = await Promise.all(userPromises);

          users.forEach((user, index) => {
            const uid = missingUserIds[index];
            if (user && user.displayName) {
              newUserNames[uid] = user.displayName;
            } else {
              // Fallback si l'utilisateur n'est pas trouvé
              newUserNames[uid] = `Utilisateur (${uid.substring(0, 8)}...)`;
            }
          });
        } catch (error) {
          console.error('Erreur lors de la récupération des noms d\'utilisateurs:', error);
          // En cas d'erreur, utiliser un fallback pour tous les IDs manqués
          missingUserIds.forEach(uid => {
            newUserNames[uid] = `Utilisateur (${uid.substring(0, 8)}...)`;
          });
        }
      }

      setUserNames(newUserNames);
      setLoading(false);
    };

    loadUserNames();
  }, [userIds.join(',')]); // Dépendance sur la concaténation des IDs

  const getUserName = (uid: string): string => {
    return userNames[uid] || `Utilisateur (${uid.substring(0, 8)}...)`;
  };

  return {
    userNames,
    loading,
    getUserName
  };
};