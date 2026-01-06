import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const usePageTitle = (pageTitle = '') => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    let title = 'ReliefChain';
    
    if (isAuthenticated && user?.roles && user.roles.length > 0) {
      const role = user.roles[0];
      const roleFormatted = role.charAt(0).toUpperCase() + role.slice(1);
      title = `${roleFormatted} - ReliefChain`;
    }
    
    if (pageTitle) {
      title = `${pageTitle} | ${title}`;
    }
    
    document.title = title;
  }, [isAuthenticated, user, pageTitle]);
};