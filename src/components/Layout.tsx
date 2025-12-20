import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ConnectButton from './ConnectButton';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/create', label: 'Create' },
  { path: '/view', label: 'View' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-divider-subtle">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-semibold text-primary">
              Vesting Escrow
            </Link>
            <nav className="hidden sm:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary font-medium'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>

      {/* Mobile navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-divider-subtle">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex items-center justify-center h-full text-sm transition-colors ${
                location.pathname === item.path
                  ? 'text-primary font-medium'
                  : 'text-secondary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
