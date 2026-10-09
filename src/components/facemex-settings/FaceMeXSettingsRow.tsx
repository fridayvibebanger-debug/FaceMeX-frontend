import { ArrowUpRight } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
};

export default function FaceMeXSettingsRow({ icon, title, description, trailing, ...buttonProps }: Props) {
  return (
    <button
      type="button"
      {...buttonProps}
      className={`flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-[#e7e7e7] bg-[#f1f1f1] px-4 py-3 text-left transition hover:bg-[#eaeaea] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#343434] dark:bg-[#1d1d1d] dark:hover:bg-[#292929] ${buttonProps.className || ''}`}
    >
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#555] dark:bg-[#292929] dark:text-[#ddd]">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-[#777] dark:text-[#aaa]">{description}</span>}
      </span>
      {trailing ?? <ArrowUpRight className="h-4 w-4 shrink-0 text-[#888] dark:text-[#aaa]" />}
    </button>
  );
}
