import React, { useMemo, useRef, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import world from 'world-atlas/countries-110m.json';

type Country = { code:string; numericCode:string|null; name:string; visited:boolean; wishlisted:boolean; visitCount:number; cityCount:number; lastVisit:string|null };
type City = { id:string;name:string;countryName:string;latitude:number;longitude:number;visitCount:number };
type Props = { countries:Country[];cities:City[];layer:string;showCities:boolean;onCountry:(code:string)=>void;onCity:(id:string)=>void };

export function WorldMap({countries,cities,layer,showCities,onCountry,onCity}:Props){
  const [zoom,setZoom]=useState(1),[offset,setOffset]=useState({x:0,y:0});
  const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  const projection=useMemo(()=>geoEqualEarth().fitExtent([[20,16],[940,484]],{type:'Sphere'}),[]);
  const path=useMemo(()=>geoPath(projection),[projection]);
  const features=useMemo(()=>(feature(world as never,(world as unknown as {objects:{countries:never}}).objects.countries) as unknown as FeatureCollection<Geometry>).features,[]);
  const byNumeric=useMemo(()=>new Map(countries.filter(c=>c.numericCode).map(c=>[String(c.numericCode).padStart(3,'0'),c])),[countries]);
  const fill=(country:Country|undefined)=>{
    if(!country?.visited)return country?.wishlisted?'var(--color-secondary-container)':'color-mix(in srgb,var(--color-surface-soft) 78%,var(--color-primary))';
    if(layer==='visited')return 'var(--color-primary-container)';
    if(layer==='recency'){
      if(!country.lastVisit)return 'var(--color-primary-container)';
      const ageInYears=(Date.now()-new Date(country.lastVisit).getTime())/(365.25*24*60*60*1000);
      return ageInYears<2?'var(--color-primary)':ageInYears<5?'color-mix(in srgb,var(--color-primary) 72%,var(--color-primary-container))':'color-mix(in srgb,var(--color-primary) 44%,var(--color-primary-container))';
    }
    const value=layer==='city_count'?Number(country.cityCount):Number(country.visitCount);
    return value>=6?'var(--color-primary)':value>=3?'color-mix(in srgb,var(--color-primary) 72%,var(--color-primary-container))':'var(--color-primary-container)';
  };
  const changeZoom=(next:number)=>setZoom(Math.max(1,Math.min(6,next)));
  return <div className="map-frame" aria-label="Interactive travel map">
    <svg viewBox="0 0 960 500" role="img" aria-labelledby="map-title map-desc" onWheel={e=>{e.preventDefault();changeZoom(zoom*(e.deltaY<0?1.18:.85));}}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y};}}
      onPointerMove={e=>{if(drag.current)setOffset({x:drag.current.ox+(e.clientX-drag.current.x)/zoom,y:drag.current.oy+(e.clientY-drag.current.y)/zoom});}}
      onPointerUp={()=>{drag.current=null}}>
      <title id="map-title">Visited places on an Equal Earth map</title><desc id="map-desc">Use the synchronized country list below for a complete keyboard-accessible alternative.</desc>
      <defs><pattern id="wish" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="var(--color-secondary-container)"/><path d="M0 8L8 0" stroke="var(--color-secondary)" strokeWidth="1"/></pattern></defs>
      <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
        <path d={path({type:'Sphere'})??''} className="map-ocean"/>
        {features.map((shape)=>{const id=String(shape.id).padStart(3,'0'),country=byNumeric.get(id);return <path key={id} d={path(shape)??''} className={`map-country ${country?.visited?'is-visited':''} ${country?.wishlisted?'is-wishlisted':''}`} fill={country?.wishlisted&&!country.visited?'url(#wish)':fill(country)} onClick={()=>country&&onCountry(country.code)}><title>{country?`${country.name}: ${country.visitCount} visits`:'Map area'}</title></path>})}
        {showCities&&zoom>=1.6&&cities.map(city=>{const point=projection([city.longitude,city.latitude]);return point?<g key={city.id} transform={`translate(${point[0]} ${point[1]})`} onClick={()=>onCity(city.id)} className="city-marker"><circle r={Math.max(2.5,5/zoom)}/><title>{city.name}, {city.countryName}: {city.visitCount} visits</title></g>:null})}
      </g>
    </svg>
    <div className="map-controls" aria-label="Map controls"><button className="icon-button" aria-label="Zoom in" onClick={()=>changeZoom(zoom*1.4)}>＋</button><button className="icon-button" aria-label="Zoom out" onClick={()=>changeZoom(zoom/1.4)}>−</button><button className="icon-button" aria-label="Reset map" onClick={()=>{setZoom(1);setOffset({x:0,y:0})}}>↺</button></div>
  </div>;
}
