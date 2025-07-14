import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/lib/translations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  changeLanguage: (language: Language) => void;
  isChangingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile for language
  const { data: userProfile } = useQuery({
    queryKey: ['/api/users', user?.id, 'profile'],
    enabled: !!user?.id,
  });

  // Update user language mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (newLanguage: Language) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await apiRequest('PUT', `/api/users/${user.id}/profile`, { language: newLanguage });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'profile'] });
    },
  });

  // Set language from user profile or localStorage
  useEffect(() => {
    if (userProfile?.language) {
      setLanguage(userProfile.language as Language);
      localStorage.setItem('preferred_language', userProfile.language);
    } else {
      // Use localStorage as fallback
      const savedLanguage = localStorage.getItem('preferred_language') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'nl')) {
        setLanguage(savedLanguage);
      }
    }
  }, [userProfile]);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Save language to localStorage immediately
    localStorage.setItem('preferred_language', newLanguage);
    
    updateLanguageMutation.mutate(newLanguage, {
      onSuccess: () => {
        // Force refresh of all components by invalidating all queries
        queryClient.invalidateQueries();
        // Reload the page to ensure all components re-render with new language
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    });
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      changeLanguage,
      isChangingLanguage: updateLanguageMutation.isPending
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}