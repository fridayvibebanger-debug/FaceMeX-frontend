import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = { to: string; label: string };

export default function FaceMeXSettingsCategoryLink({ to, label }: Props) {
  return (
    <Link
      to={to}
      className="flex min-h-10 items-center justify-between rounded-lg border border-[#d6d6d6] bg-white px-4 text-sm font-medium text-[#202123] transition hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777] dark:border-[#444] dark:bg-[#202020] dark:text-[#f5f5f5] dark:hover:bg-[#282828] dark:focus-visible:outline-[#ccc]"
    >
      {label}
      <ArrowUpRight className="h-4 w-4 text-[#777] dark:text-[#aaa]" />
    </Link>
  );
}
