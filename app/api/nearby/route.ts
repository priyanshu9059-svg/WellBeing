import { NextRequest, NextResponse } from 'next/server';

type ServiceType = 'Mental health clinics' | 'Hospitals' | 'Police stations' | 'Trauma support & NGOs';
type OsmElement = { id:number; type:'node'|'way'|'relation'; lat?:number; lon?:number; center?:{lat:number;lon:number}; tags?:Record<string,string> };
type NearbyPlace = { id:string; name:string; type:ServiceType; area:string; latitude:number; longitude:number; distanceKm:number; phone:string; hours:string; website:string; specialties:string[] };

const cache = new Map<string, { expires:number; places:NearbyPlace[]; resolvedArea:string }>();
const CACHE_MS = 15 * 60 * 1000;
const SEARCH_RADIUS_METRES = 5000;

function distanceKm(lat1:number,lon1:number,lat2:number,lon2:number){
  const radians=(degrees:number)=>degrees*Math.PI/180;
  const dLat=radians(lat2-lat1);const dLon=radians(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function classify(tags:Record<string,string>):ServiceType{
  if(tags.amenity==='police')return 'Police stations';
  if(tags.amenity==='hospital'||tags.healthcare==='hospital')return 'Hospitals';
  if(tags.office==='ngo'||tags.amenity==='social_facility')return 'Trauma support & NGOs';
  return 'Mental health clinics';
}

function addressFor(tags:Record<string,string>){
  const street=[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ');
  return [street,tags['addr:suburb'],tags['addr:city']].filter(Boolean).join(', ')||tags['addr:full']||tags.description||'Address available on the map';
}

function specialtiesFor(type:ServiceType,tags:Record<string,string>){
  const details=(tags['healthcare:speciality']||tags.social_facility||'').split(';').filter(Boolean);
  const label=type==='Trauma support & NGOs'?'Trauma and community support':type;
  return [label,...details.map(item=>item.replaceAll('_',' '))].slice(0,3);
}

async function geocode(area:string){
  const url=new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q',area);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','1');url.searchParams.set('addressdetails','1');
  const response=await fetch(url,{headers:{'User-Agent':'WellbeingSupportNearbyCare/1.0'}});
  if(!response.ok)throw new Error('Location search is temporarily unavailable.');
  const results=await response.json() as Array<{lat:string;lon:string;display_name:string}>;
  if(!results.length)throw new Error('We could not find that location. Try a city, area, or postcode.');
  return {lat:Number(results[0].lat),lon:Number(results[0].lon),label:results[0].display_name};
}

async function queryNearby(lat:number,lon:number){
  const around=`(around:${SEARCH_RADIUS_METRES},${lat},${lon})`;
  const query=`[out:json][timeout:25];(
    nwr["amenity"="police"]${around};
    nwr["amenity"="hospital"]${around};
    nwr["healthcare"="hospital"]${around};
    nwr["amenity"="clinic"]${around};
    nwr["healthcare"~"psychiatrist|psychotherapist|psychologist|mental_health|clinic"]${around};
    nwr["amenity"="clinic"]["healthcare:speciality"~"psychiatry|psychology|mental_health",i]${around};
    nwr["office"="ngo"]["name"~"trauma|mental|crisis|support|violence|women|child|counsel|rehabilitation",i]${around};
    nwr["amenity"="social_facility"]["social_facility"~"counselling|outreach|shelter|ambulatory_care"]${around};
  );out center tags;`;
  const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':'WellbeingSupportNearbyCare/1.0'},body:new URLSearchParams({data:query})});
  if(!response.ok)throw new Error('Nearby services are temporarily unavailable. Please try again.');
  return (await response.json() as {elements:OsmElement[]}).elements;
}

export async function GET(request:NextRequest){
  try{
    const params=request.nextUrl.searchParams;const area=(params.get('area')||'').trim();
    const suppliedLat=Number(params.get('lat'));const suppliedLon=Number(params.get('lon'));
    const hasCoordinates=params.has('lat')&&params.has('lon')&&Number.isFinite(suppliedLat)&&Number.isFinite(suppliedLon);
    if(!area&&!hasCoordinates)return NextResponse.json({error:'Enter a location to search.'},{status:400});
    const cacheKey=hasCoordinates?`${suppliedLat.toFixed(4)},${suppliedLon.toFixed(4)}`:area.toLowerCase();
    const cached=cache.get(cacheKey);if(cached&&cached.expires>Date.now())return NextResponse.json(cached);
    const location=hasCoordinates?{lat:suppliedLat,lon:suppliedLon,label:area||'Current location'}:await geocode(area);
    const elements=await queryNearby(location.lat,location.lon);
    const places=elements.flatMap((element):NearbyPlace[]=>{
      const latitude=element.lat??element.center?.lat;const longitude=element.lon??element.center?.lon;const tags=element.tags??{};
      if(latitude===undefined||longitude===undefined||!tags.name)return [];
      const type=classify(tags);
      return [{id:`osm-${element.type}-${element.id}`,name:tags.name,type,area:addressFor(tags),latitude,longitude,distanceKm:distanceKm(location.lat,location.lon,latitude,longitude),phone:tags.phone||tags['contact:phone']||'',hours:tags.opening_hours||'Contact for hours',website:tags.website||tags['contact:website']||'',specialties:specialtiesFor(type,tags)}];
    }).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,40);
    const payload={places,resolvedArea:location.label,expires:Date.now()+CACHE_MS};cache.set(cacheKey,payload);
    return NextResponse.json(payload,{headers:{'Cache-Control':'public, max-age=300, s-maxage=900'}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Nearby search failed.'},{status:502});}
}
