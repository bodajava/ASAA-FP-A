import { redirect } from 'next/navigation';

// Root page: redirect to the dashboard (auth guard in layout handles unauthenticated users)
export default function RootPage() {
  redirect('/dashboard');
}
