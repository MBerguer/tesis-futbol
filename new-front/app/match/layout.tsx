"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MatchProvider } from "./context";

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [reloadToken, setReloadToken] = useState<number>(0);
  const [fullWidth, setFullWidth] = useState<boolean>(false);

  const selectedTable = useMemo(() => searchParams.get('table'), [searchParams]);

  return (
    <MatchProvider value={{
      selectedTable,
      setSelectedTable: (t: string | null) => {
        const url = new URL(window.location.href);
        if (t) url.searchParams.set('table', t); else url.searchParams.delete('table');
        router.replace(`${pathname}?${url.searchParams.toString()}`);
        try { if (t) localStorage.setItem('lastTable', t); } catch {}
        setReloadToken((x)=>x+1);
      },
      reloadToken,
      reload: () => setReloadToken((x)=>x+1),
      fullWidth
    }}>
      <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} p-4 md:p-6`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-xl font-semibold">Partido</div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFullWidth(v => { const nv = !v; try { localStorage.setItem('content_fullwidth', nv ? '1' : '0'); } catch {} return nv; })}
              className={`${fullWidth ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-900/50 text-zinc-300 border-zinc-800 hover:border-zinc-700'} border px-3 py-1.5 rounded-md text-sm`}
              title={fullWidth ? 'Switch to centered width' : 'Expand to full width'}
            >
              {fullWidth ? 'Centered' : 'Full width'}
            </button>
          </div>
        </div>
      </div>
      <div className={`${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-4 md:px-6`}>{children}</div>
    </MatchProvider>
  );
}


