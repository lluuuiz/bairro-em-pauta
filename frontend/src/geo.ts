import { useEffect, useState } from "react";
import type { Neighborhood } from "./api";

// Local de demonstração (Cidade Universitária, Recife), usado quando o GPS não está disponível.
export const DEMO = { lat: -8.051, lng: -34.95 };

export interface Position { lat: number; lng: number; source: "gps" | "demo" }

export function useGeo(): Position {
  const [pos, setPos] = useState<Position>({ ...DEMO, source: "demo" });
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, source: "gps" }),
      () => setPos({ ...DEMO, source: "demo" }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);
  return pos;
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function nearest(hoods: Neighborhood[], lat: number, lng: number) {
  return hoods.reduce<Neighborhood | null>(
    (best, h) => (!best || distanceM(lat, lng, h.latitude, h.longitude) < distanceM(lat, lng, best.latitude, best.longitude) ? h : best),
    null
  );
}
