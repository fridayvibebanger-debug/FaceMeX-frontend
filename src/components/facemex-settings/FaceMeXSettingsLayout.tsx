import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function FaceMeXSettingsLayout({ title, description, children }: Props) {
  return (
    <section className="mx-auto max-w-2xl" aria-labelledby="facemex-settings-category-title">
      <h2 id="facemex-settings-category-title" className="mb-2 text-xl font-semibold">{title}</h2>
      {description && <p className="mb-5 text-sm text-[#707070] dark:text-[#aaa]">{description}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
