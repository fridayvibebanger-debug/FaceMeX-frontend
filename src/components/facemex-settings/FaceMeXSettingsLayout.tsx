import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function FaceMeXSettingsLayout({ title, description, children }: Props) {
  return (
    <section className="w-full min-w-0 space-y-4" aria-label={title}>
      {description && <p className="fm-settings-explainer">{description}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
