import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function BackToSettingsButton({
  label = 'Back to Settings',
}: {
  label?: string;
}) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mb-4 rounded-full"
      onClick={() => navigate('/settings')}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
