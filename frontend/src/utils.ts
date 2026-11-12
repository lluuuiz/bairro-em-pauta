export function timeAgo(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} d`;
}

export function distanceLabel(m?: number | null) {
  if (m === undefined || m === null) return "";
  return m < 1000 ? `a ${m} m` : `a ${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  window.speechSynthesis.speak(u);
}

export const isoDay = (d: Date) => d.toLocaleDateString("en-CA");
