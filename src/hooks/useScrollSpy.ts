import { useEffect, useState, useRef } from 'react';

interface UseScrollSpyOptions {
  threshold?: number;
  rootMargin?: string;
  sectionIds: string[];
}

export function useScrollSpy({ 
  threshold = 0.5, 
  rootMargin = '-20% 0px -70% 0px',
  sectionIds 
}: UseScrollSpyOptions) {
  const [activeSection, setActiveSection] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sectionRefs = useRef<Map<string, IntersectionObserverEntry>>(new Map());

  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            sectionRefs.current.set(entry.target.id, entry);
          } else {
            sectionRefs.current.delete(entry.target.id);
          }
        });

        // Find the section with the highest intersection ratio
        let maxRatio = 0;
        let maxId = '';

        sectionRefs.current.forEach((entry, id) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxId = id;
          }
        });

        if (maxId && maxId !== activeSection) {
          setActiveSection(maxId);
        }
      },
      {
        threshold: [0, threshold, 1],
        rootMargin,
      }
    );

    // Observe all sections
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observerRef.current?.observe(element);
      }
    });

    // Handle initial hash in URL
    const hash = window.location.hash.slice(1);
    if (hash && sectionIds.includes(hash)) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(hash);
        }, 100);
      }
    } else if (sectionIds.length > 0) {
      // Set first section as active if no hash
      setActiveSection(sectionIds[0]);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, sectionIds.join(',')]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without triggering scroll
      window.history.pushState(null, '', `#${id}`);
      setActiveSection(id);
    }
  };

  return { activeSection, scrollToSection };
}

