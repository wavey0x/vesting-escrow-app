import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-primary mb-4">Vesting Escrow</h1>
        <p className="text-lg text-secondary max-w-2xl mx-auto mb-8">
          Deploy and manage token vesting escrows on Ethereum. Create linear
          vesting schedules with optional cliff periods for your team, investors,
          or contributors.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/create">
            <Button size="lg">Create</Button>
          </Link>
          <Link to="/view">
            <Button size="lg">View</Button>
          </Link>
        </div>
      </section>

    </div>
  );
}

