'use client';

export function LogoLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className={className}
    >
      {children}
    </a>
  );
}
