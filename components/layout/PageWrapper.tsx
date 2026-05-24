import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function PageWrapper({ children, title, description }: PageWrapperProps) {
  return (
    <div className="space-y-6">
      {(title || description) && (
        <div>
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
