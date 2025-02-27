import UnRequireAuth from '@/components/utils/unRequireAuth';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  return <UnRequireAuth>{children}</UnRequireAuth>;
}
