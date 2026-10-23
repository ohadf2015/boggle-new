'use client';

import { useEffect } from 'react';
import './eduSiteNav.css';

export const EDU_SURFACE_BODY_CLASS = 'edu-app-surface';

export function EduSiteNavHider() {
  useEffect(() => {
    document.body.classList.add(EDU_SURFACE_BODY_CLASS);
    return () => document.body.classList.remove(EDU_SURFACE_BODY_CLASS);
  }, []);
  return null;
}
