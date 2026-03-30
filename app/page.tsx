import { Header } from '@/components/layout/Header';
import { WelcomePage } from '@/components/welcome/WelcomePage';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="min-h-screen bg-sage-50 selection:bg-secondary-container">
      <Header />
      <WelcomePage />
    </main>
  );
}
