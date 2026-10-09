import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = { to: string; label: string };

export default function FaceMeXSettingsCategoryLink({ to, label }: Props) {
  return (
    <Link
      to={to}
      className="flex min-h-12 items-center justify-between rounded-xl border border-[#e6e6e6] bg-white px-4 text-sm font-medium text-[#252525] transition hover:bg-[#f4f4f4] dark:border-[#393939] dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]"
    >
      {label}
      <ArrowUpRight className="h-4 w-4 text-[#777] dark:text-[#aaa]" />
    </Link>
  );
}
