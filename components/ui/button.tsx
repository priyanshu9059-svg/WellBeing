import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
export function Button({className,variant='primary',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger'}) { return <button className={cn('btn',`btn-${variant}`,className)} {...props}/>; }
