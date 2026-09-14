export function cn(...classes:(string|false|null|undefined)[]) { return classes.filter(Boolean).join(' '); }
export function downloadJson(name:string, data:unknown) { const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=name; link.click(); URL.revokeObjectURL(url); }
export function newId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
