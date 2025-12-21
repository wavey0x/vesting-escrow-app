import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ConnectButton from './ConnectButton';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'View' },
  { path: '/create', label: 'Create' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-divider-subtle">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="hidden sm:block text-xl font-semibold text-primary w-24">
            Vests
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/' && location.pathname.startsWith('/view/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm transition-colors ${
                    isActive
                      ? 'text-primary underline underline-offset-4'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 w-24 justify-end">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
