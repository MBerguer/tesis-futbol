export function formatTime(seconds?: number) {
  if (seconds === undefined || seconds === null) return "-";
  const raw = Math.floor(Math.abs(seconds));
  const mins = Math.floor(raw / 60);
  const secs = raw % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatMatchTime(seconds?: number) {
  if (seconds === undefined || seconds === null) return "-";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function toAbsoluteTime(baseTime: string | null | undefined, sec?: number) {
  if (!baseTime || sec === undefined || sec === null) return "-";
  const [hh, mm, ssms] = baseTime.split(":");
  const ssInt = parseInt((ssms || "0").split(".")[0] || '0', 10);
  const baseSeconds = parseInt(hh || '0', 10) * 3600 + parseInt(mm || '0', 10) * 60 + ssInt;
  const target = Math.floor(baseSeconds + Math.floor(sec));
  const h = Math.floor(target / 3600) % 24;
  const m = Math.floor((target % 3600) / 60);
  const s = target % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(start?: number, end?: number) {
  if (start === undefined || end === undefined) return "-";
  const diff = Math.max(0, Math.floor(end - start));
  const hh = Math.floor(diff / 3600);
  const mm = Math.floor((diff % 3600) / 60);
  const ss = diff % 60;
  return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
}

export function parseMmSsToSeconds(input: string): number | null {
  if (!input) return null;
  const parts = input.split(":").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (!isFinite(m) || !isFinite(s)) return null;
  if (m < 0 || s < 0 || s >= 60) return null;
  return m * 60 + s;
}

export function formatMmSsFromSeconds(sec?: number | null): string {
  if (sec === undefined || sec === null || !isFinite(sec)) return "";
  const v = Math.max(0, Math.floor(sec));
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}


