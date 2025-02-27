import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterMutation } from '@/redux/features/authApiSlice';
import { toast } from 'react-toastify';

// structure of the expected error response
interface RegisterErrorResponse {
  [key: string]: string[]; // Each key (field name) maps to an array of error messages
}

export default function useRegister() {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    re_password: '',
  });

  const { first_name, last_name, email, password, re_password } = formData;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    register({ first_name, last_name, email, password, re_password })
      .unwrap()
      .then(() => {
        toast.success('Please check your email to verify your account');
        router.push('/auth/login');
      })
      .catch((error) => {
        // Check if the error has a response with a status and data
        if (error?.status === 400 && error?.data) {
          const errors: RegisterErrorResponse = error.data; // Ensure it matches our defined type

          // Iterate through the error messages and display them using toast
          for (const [field, messages] of Object.entries(errors)) {
            // Ensure messages is of type string[]
            if (Array.isArray(messages)) {
              messages.forEach((message: string) => {
                toast.error(`${message}`);
              });
            }
          }
        } else {
          // Fallback for any other errors
          toast.error('Failed to register account');
        }
      });
  };

  return {
    first_name,
    last_name,
    email,
    password,
    re_password,
    isLoading,
    onChange,
    onSubmit,
  };
}
