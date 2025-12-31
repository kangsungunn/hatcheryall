"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/light-v11", // 나중에 커스텀
      center: [126.9780, 37.5665], // 서울시청
      zoom: 17,
      bearing: 0,
      pitch: 45,
    });

    return () => mapInstance.current?.remove();
  }, []);


  useEffect(() => {
    if (!mapInstance.current) return;
  
    let prevHeading: number | null = null;
  
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
  
        if (!heading) return;
  
        // 코너 감지: 이전 각도와 차이가 클 때만
        if (prevHeading !== null && Math.abs(prevHeading - heading) < 15) return;
  
        prevHeading = heading;
  
        mapInstance.current!.easeTo({
          center: [longitude, latitude],
          bearing: heading,
          duration: 600,
          zoom: 17,
        });
      },
      (err) => console.error(err),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
      }
    );
  
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);


  
  return <div ref={mapRef} style={{ width: "100%", height: "100vh" }} />;

}
