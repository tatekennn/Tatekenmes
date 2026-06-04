import type { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}
