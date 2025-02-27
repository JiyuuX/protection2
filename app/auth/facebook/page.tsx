'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/redux/hooks';
import { useSocialAuthenticateMutation } from '@/redux/features/authApiSlice';
import { setAuth } from '@/redux/features/authSlice';
import { toast } from 'react-toastify';
import { Spinner } from '@/components/common';

const FacebookAuthPage = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [facebookAuthenticate] = useSocialAuthenticateMutation();

  const authenticate = async () => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const code = params.get('code');

    if (state && code) {
      try {
        await facebookAuthenticate({ provider: 'facebook', state, code }).unwrap();
        dispatch(setAuth());
        toast.success('Logged in');
        router.push('/dashboard');
      } catch {
        toast.error('Failed to log in');
        router.push('/auth/login');
      }
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <Suspense fallback={<Spinner lg />}>
      <div className='my-8'>
        <Spinner lg />
      </div>
    </Suspense>
  );
};

export default FacebookAuthPage;
