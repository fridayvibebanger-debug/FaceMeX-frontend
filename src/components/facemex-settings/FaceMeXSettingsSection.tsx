import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

export default function FaceMeXSettingsSection({ title, children }: Props) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#777] dark:text-[#aaa]">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
