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
      className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl border border-[#dedede] bg-white px-4 py-3 text-left transition hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#333] dark:bg-[#171717] dark:hover:bg-[#202020] dark:focus-visible:outline-[#ccc] ${buttonProps.className || ''}`}
    >
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f1f1] text-[#555] dark:bg-[#202020] dark:text-[#ddd]">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-[#777] dark:text-[#aaa]">{description}</span>}
      </span>
      {trailing ?? <ArrowUpRight className="h-4 w-4 shrink-0 text-[#888] dark:text-[#aaa]" />}
    </button>
  );
}
