// ─────────────────────────────────────────────────────────────────────────────
//  DEMONSTRATION DATA — not real service information.
//  Everything below is sample content so the interface can be designed and tested. It is kept apart from the
//  application logic: replace data/trip-service.js (and this file) with real data when it is connected.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_NOTICE = 'Demonstration data — not real service information.';

// Stops (x, y only place them on the sample schematic map)
export const STOPS = [
  { id: 'santa',      name: 'Santa Mooica',                 x: 60,  y: 120 },
  { id: 'asian',      name: 'Asian Town',                   x: 170, y: 110 },
  { id: 'union',      name: 'Union Station',                x: 290, y: 150, hub: true },
  { id: 'downtown',   name: 'Downtown Lego City',           x: 420, y: 150, hub: true },
  { id: 'emerg',      name: 'Emergency HQ',                 x: 540, y: 190 },
  { id: 'wwestern',   name: 'William/Western',              x: 650, y: 220 },
  { id: 'museum',     name: 'Museum',                       x: 290, y: 50 },
  { id: 'stadium',    name: 'Stadium',                      x: 290, y: 260 },
  { id: 'deathstar',  name: 'Death Star City',              x: 300, y: 370, hub: true },
  { id: 'airport',    name: 'Airport Metro Transit Center', x: 440, y: 410, hub: true },
  { id: 'flx',        name: 'FLX T2',                       x: 480, y: 280 },
  { id: 'desktop',    name: 'Desktop Hills',                x: 570, y: 440 },
  { id: 'tablec',     name: 'Table Central',                x: 680, y: 410 },
  { id: 'nhollywood', name: 'North Hollowwood',             x: 735, y: 330 },
  { id: 'market',     name: 'Market Street',                x: 235, y: 215 },
  { id: 'oakpark',    name: 'Oak Park',                     x: 185, y: 310 },
  { id: 'lakeview',   name: 'Lakeview',                     x: 120, y: 430 },
  { id: 'couch',      name: 'Couch Chair Park',             x: 255, y: 395 },
  { id: 'dine',       name: 'Dine Park',                    x: 215, y: 350 },
  { id: 'harbor',     name: 'Harbor Annex',                 x: 700, y: 90, noService: true }   // no service: previews the "no results" state
];

// Lines. `headway` = minutes between vehicles, `hop` = minutes between stops, `stops` = running order.
export const LINES = [
  { id: 'A',   name: 'A Line',    type: 'rail', color: '#0b6fba', textColor: '#ffffff', headway: 10, offset: 3, hop: 3, stops: ['santa', 'asian', 'union', 'downtown', 'emerg', 'wwestern'] },
  { id: 'B',   name: 'B Line',    type: 'rail', color: '#d6181f', textColor: '#ffffff', headway: 12, offset: 7, hop: 3, stops: ['museum', 'union', 'stadium', 'deathstar', 'airport'] },
  { id: 'E',   name: 'E Line',    type: 'rail', color: '#f1ae1b', textColor: '#111111', headway: 15, offset: 1, hop: 4, stops: ['downtown', 'flx', 'airport', 'desktop', 'tablec', 'nhollywood'] },
  { id: '111', name: 'Route 111', type: 'bus',  color: '#e8590c', textColor: '#ffffff', headway: 15, offset: 5, hop: 4, stops: ['union', 'market', 'oakpark', 'lakeview'] },
  { id: '38',  name: 'Route 38',  type: 'bus',  color: '#7c3aed', textColor: '#ffffff', headway: 20, offset: 9, hop: 4, stops: ['deathstar', 'couch', 'dine', 'oakpark', 'lakeview'] }
];

// Short walks between nearby stops (minutes)
export const WALKS = [
  { a: 'market', b: 'downtown', min: 6 },
  { a: 'emerg', b: 'flx', min: 5 },
  { a: 'couch', b: 'stadium', min: 8 }
];

// Landmarks people can search for. `stopId` = the stop they are nearest to, `walkMin` = the walk from there.
export const LANDMARKS = [
  { id: 'cityhall',  name: 'Lego City Hall',          stopId: 'downtown',  walkMin: 4 },
  { id: 'pier',      name: 'Santa Mooica Pier',       stopId: 'santa',     walkMin: 6 },
  { id: 'tours',     name: 'Death Star Tours',        stopId: 'deathstar', walkMin: 5 },
  { id: 'foodhall',  name: 'Union Station Food Hall', stopId: 'union',     walkMin: 2 },
  { id: 'lakepark',  name: 'Lakeview Park',           stopId: 'lakeview',  walkMin: 7 },
  { id: 'terminal1', name: 'Airport Terminal 1',      stopId: 'airport',   walkMin: 5 },
  { id: 'stadiumc',  name: 'Stadium Gate C',          stopId: 'stadium',   walkMin: 4 }
];

// Sample service alerts. `lines` = affected lines, `stops` = affected stops. `minsAgo` is only for display.
export const ALERTS = [
  { id: 'a1', severity: 'warning', lines: ['A'],  stops: [],          minsAgo: 38,   title: 'Weekend work on A Line',          body: 'Expect delays between Union Station and Downtown Lego City while track work is finished.' },
  { id: 'a2', severity: 'info',    lines: ['38'], stops: [],          minsAgo: 140,  title: 'Route 38 detour near Oak Park',   body: 'Buses use Market Street while a water main is repaired. Allow a few extra minutes.' },
  { id: 'a3', severity: 'info',    lines: [],     stops: ['stadium'], minsAgo: 1500, title: 'Elevator maintenance at Stadium', body: 'The street-level elevator is out of service. Use the escalators or the Gate C entrance.' }
];

// Sample "recent searches" and "saved places" shown on the home screen until real data exists.
export const SAMPLE_RECENTS = [
  { o: 'union',    d: 'airport',  mode: 'now' },
  { o: 'santa',    d: 'lakeview', mode: 'depart', t: '08:15' },
  { o: 'cityhall', d: 'tours',    mode: 'arrive', t: '18:30' }
];
export const SAMPLE_SAVED = [
  { label: 'Home',    placeId: 'lakepark' },
  { label: 'Work',    placeId: 'cityhall' },
  { label: 'Airport', placeId: 'terminal1' }
];
