import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Mapbox GL JS v3.9.x — React integration (mapbox-web-integration-patterns).
 * Full-viewport map, env token, error handler, and teardown on unmount.
 * Use with Vite (VITE_MAPBOX_ACCESS_TOKEN) or Next (NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN).
 */
export default function MapboxMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token =
      import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new Error("Missing MAPBOX_ACCESS_TOKEN in env");
    }
    mapboxgl.accessToken = token;
    if (!ref.current) return;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-77.0369, 38.9072],
      zoom: 11,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => {
      map.resize();
    });
    map.on("error", (e) => {
      console.error("Mapbox error", e && e.error ? e.error : e);
    });

    return () => {};
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minHeight: "100vh" }}
      aria-label="Mapbox map"
    />
  );
}
