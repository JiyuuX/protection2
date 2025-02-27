'use client';
import { RequireAuth } from '@/components/utils';
const ProjectLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    
    <main>
      {children} {/* Proje sayfası içeriği */}
      <RequireAuth>{children}</RequireAuth>;
    </main>
    
  );
};

export default ProjectLayout;




