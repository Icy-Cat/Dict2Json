'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, args?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use a stable default for SSR and first client render
  const [language, setLanguage] = useState<Language>('en');

  // After mount, sync from localStorage or browser language
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = window.localStorage.getItem('pyson_lang') as Language | null;
    if (saved === 'en' || saved === 'zh') {
      setLanguage(saved);
      return;
    }

    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.toLowerCase();
      setLanguage(browserLang.startsWith('zh') ? 'zh' : 'en');
    }
  }, []);

  // Persist selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pyson_lang', language);
    }
  }, [language]);

  const t = (path: string, args?: Record<string, any>) => {
    const keys = path.split('.');
    let current: any = TRANSLATIONS[language];
    for (const key of keys) {
      if (current === undefined) return path;
      current = current[key];
    }
    
    if (typeof current !== 'string') return path;

    let result = current;
    if (args) {
      Object.entries(args).forEach(([key, value]) => {
        // Replace {key} with value
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      });
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
