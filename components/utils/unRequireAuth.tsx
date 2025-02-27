'use client';

import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux/hooks';
import { Spinner } from '@/components/common';

interface Props {
  children: React.ReactNode;
}

export default function UnRequireAuth({ children }: Props) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAppSelector(state => state.auth);

  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <Spinner lg />
      </div>
    );
  }

  // if user logged in, push to /dashboard 
  if (isAuthenticated) {
    router.push('/dashboard'); // 
    return null; // don't render the page, when we redirect-pushing.. 
  }

  // Giriş yapılmamışsa içeriği göster
  return <>{children}</>;
}
