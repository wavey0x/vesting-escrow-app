import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-8">
        <p className="text-sm text-secondary max-w-lg mx-auto mb-6">
          Deploy and manage token vesting escrows on Ethereum. Create linear
          vesting schedules with optional cliff periods.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/create">
            <Button>Create</Button>
          </Link>
          <Link to="/view">
            <Button>View</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

