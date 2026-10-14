// ─────────────────────────────────────────────────────────────────────────────
//  Trip service — the ONLY module the views use to get places and trips.
//
//  Today it answers from the demonstration network in demo-data.js. To connect real data later, keep these four
//  exports and their return shapes and replace the bodies:
//      searchPlaces(query)        -> Place[]
//      getPlace(id)               -> Place | null
//      findTrips(query)           -> Promise<{ trips: Trip[] }>      (reject on failure)
//      alertsForTrip(trip)        -> Alert[]
//  Nothing outside this file knows how trips are produced.
// ─────────────────────────────────────────────────────────────────────────────
import { STOPS, LINES, WALKS, LANDMARKS, ALERTS } from './demo-data.js';

export const MY_LOCATION = { id: 'my-location', name: 'My location', kind: 'location', stopId: 'union', walkMin: 4 };

const stopById = Object.fromEntries(STOPS.map(s => [s.id, s]));
const lineById = Object.fromEntries(LINES.map(l => [l.id, l]));
const PLACES = [
  ...STOPS.map(s => ({ id: s.id, name: s.name, kind: 'stop', stopId: s.id, walkMin: 0 })),
  ...LANDMARKS.map(l => ({ id: l.id, name: l.name, kind: 'landmark', stopId: l.stopId, walkMin: l.walkMin }))
];
const placeById = Object.fromEntries([...PLACES, MY_LOCATION].map(p => [p.id, p]));

export const getPlace = id => placeById[id] || null;
export const getLine = id => lineById[id] || null;
export const getStop = id => stopById[id] || null;
export const allLines = () => LINES.slice();
export const allStops = () => STOPS.slice();
export const linesAtStop = stopId => LINES.filter(l => l.stops.includes(stopId));

// Free-text place search: best matches first (name starts with the text, then contains every word).
export function searchPlaces(query, limit = 6) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return PLACES.filter(p => p.kind === 'stop' && stopById[p.id].hub).slice(0, limit);
  const words = q.split(/\s+/);
  const scored = [];
  for (const p of PLACES) {
    const n = p.name.toLowerCase();
    if (n.startsWith(q)) scored.push([0, p]);
    else if (words.every(w => n.includes(w))) scored.push([1, p]);
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map(s => s[1]);
}
// Exact (case-insensitive) name → place, used when someone types a full name and moves on.
export function resolvePlaceName(text) {
  const t = String(text || '').trim().toLowerCase();
  return t ? [...PLACES, MY_LOCATION].find(p => p.name.toLowerCase() === t) || null : null;
}

// ── alerts ──
export function alertsForLine(lineId) { return ALERTS.filter(a => a.lines.includes(lineId)); }
export function alertsForTrip(trip) {
  const stops = new Set(trip.steps.flatMap(s => [s.stopId, ...(s.stopIds || [])]).filter(Boolean));
  return ALERTS.filter(a => a.lines.some(l => trip.lineIds.includes(l)) || a.stops.some(s => stops.has(s)));
}
export const allAlerts = () => ALERTS.slice();

// ── the demonstration timetable ──
const TRANSFER_MIN = 2, MAX_RIDES = 3, MAX_LEGS = 5;
const nextDeparture = (line, minute) => Math.ceil((minute - line.offset) / line.headway) * line.headway + line.offset;   // first departure at/after `minute`
const MIN_MS = 60000;

// All ways to get from stop `o` to stop `d`: sequences of rides, with at most one short walk between stops.
function enumeratePaths(o, d) {
  const paths = [];
  const dfs = (stop, legs, usedLines, visited, walked) => {
    if (stop === d && legs.length) { paths.push(legs.slice()); return; }
    if (legs.length >= MAX_LEGS) return;
    if (legs.filter(l => l.kind === 'ride').length < MAX_RIDES) {
      for (const line of LINES) {
        if (usedLines.has(line.id)) continue;
        const from = line.stops.indexOf(stop);
        if (from < 0) continue;
        for (let to = 0; to < line.stops.length; to++) {
          const t = line.stops[to];
          if (to === from || visited.has(t)) continue;
          legs.push({ kind: 'ride', lineId: line.id, from, to });
          usedLines.add(line.id); visited.add(t);
          dfs(t, legs, usedLines, visited, false);
          visited.delete(t); usedLines.delete(line.id); legs.pop();
        }
      }
    }
    if (!walked && !legs.some(l => l.kind === 'walk')) {
      for (const w of WALKS) {
        const other = w.a === stop ? w.b : w.b === stop ? w.a : null;
        if (!other || visited.has(other)) continue;
        legs.push({ kind: 'walk', from: stop, to: other, min: w.min });
        visited.add(other);
        dfs(other, legs, usedLines, visited, true);
        visited.delete(other); legs.pop();
      }
    }
  };
  dfs(o, [], new Set(), new Set([o]), false);
  return paths;
}

const pathKey = p => p.map(l => l.kind === 'ride' ? `${l.lineId}:${l.from}>${l.to}` : `w:${l.from}>${l.to}`).join('|');
const linesKey = p => p.map(l => l.kind === 'ride' ? l.lineId : 'w').join('>');

// Run one path against the timetable, leaving the origin at `depMin` (epoch minutes).
function simulate(path, depMin, O, D) {
  let t = depMin;
  const steps = [];
  const at = (m) => m * MIN_MS;
  const firstStop = path[0].kind === 'ride' ? lineById[path[0].lineId].stops[path[0].from] : path[0].from;

  if (O.walkMin > 0) {
    steps.push({ type: 'walk', title: `Walk to ${stopById[firstStop].name}`, detail: `From ${O.name}`, start: at(t), end: at(t + O.walkMin), minutes: O.walkMin, stopId: firstStop });
    t += O.walkMin;
  }
  let prevRide = false, lastStop = firstStop, rides = 0, walkMin = O.walkMin;
  const chain = O.walkMin > 0 ? [{ kind: 'walk', min: O.walkMin }] : [];
  let boardingStop = null, alightStop = null;

  for (const leg of path) {
    if (leg.kind === 'walk') {
      steps.push({ type: 'walk', transfer: true, title: `Walk to ${stopById[leg.to].name}`, detail: 'Transfer on foot', start: at(t), end: at(t + leg.min), minutes: leg.min, stopId: leg.to });
      t += leg.min; walkMin += leg.min; lastStop = leg.to; prevRide = false;
      chain.push({ kind: 'walk', min: leg.min });
      continue;
    }
    const line = lineById[leg.lineId];
    const boardId = line.stops[leg.from], alightId = line.stops[leg.to];
    const headsign = stopById[line.stops[leg.to > leg.from ? line.stops.length - 1 : 0]].name;
    if (prevRide) {
      steps.push({ type: 'transfer', lineId: line.id, title: `Transfer to ${line.name}`, detail: `at ${stopById[boardId].name}`, start: at(t), end: at(t + TRANSFER_MIN), minutes: TRANSFER_MIN, stopId: boardId });
      t += TRANSFER_MIN;
    }
    const board = nextDeparture(line, t);
    if (board > t) steps.push({ type: 'wait', lineId: line.id, title: `Wait for ${line.name}`, detail: `toward ${headsign} · every ${line.headway} min`, start: at(t), end: at(board), minutes: board - t, stopId: boardId });
    steps.push({ type: 'board', lineId: line.id, title: `Board ${line.name} toward ${headsign}`, detail: stopById[boardId].name, start: at(board), end: at(board), stopId: boardId });
    const hops = Math.abs(leg.to - leg.from), dur = hops * line.hop;
    const dir = leg.to > leg.from ? 1 : -1, via = [];
    for (let i = leg.from + dir; i !== leg.to; i += dir) via.push(line.stops[i]);
    steps.push({ type: 'ride', lineId: line.id, title: `Ride ${hops} stop${hops === 1 ? '' : 's'} to ${stopById[alightId].name}`, detail: `${line.name} toward ${headsign}`, start: at(board), end: at(board + dur), minutes: dur, stopCount: hops, stopIds: via, stopId: alightId });
    t = board + dur; lastStop = alightId; prevRide = true; rides++;
    chain.push({ kind: 'ride', lineId: line.id });
    if (!boardingStop) boardingStop = stopById[boardId].name;
    alightStop = stopById[alightId].name;
  }

  if (D.walkMin > 0) {
    steps.push({ type: 'walk-final', title: `Walk to ${D.name}`, detail: `From ${stopById[lastStop].name}`, start: at(t), end: at(t + D.walkMin), minutes: D.walkMin, stopId: lastStop });
    t += D.walkMin; walkMin += D.walkMin; chain.push({ kind: 'walk', min: D.walkMin });
  } else {
    steps.push({ type: 'arrive', title: `Arrive at ${D.name}`, detail: '', start: at(t), end: at(t), stopId: lastStop });
  }
  return {
    depart: at(depMin), arrive: at(t), duration: t - depMin, transfers: Math.max(0, rides - 1), rides, walkMin,
    steps, chain, lineIds: [...new Set(path.filter(l => l.kind === 'ride').map(l => l.lineId))],
    boardingStop: boardingStop || stopById[firstStop].name, alightStop: alightStop || stopById[lastStop].name
  };
}

function walkOnly(depMin, O, D) {
  const minutes = Math.max(2, Math.abs(O.walkMin - D.walkMin) + 2);
  const t = depMin + minutes;
  return [{
    depart: depMin * MIN_MS, arrive: t * MIN_MS, duration: minutes, transfers: 0, rides: 0, walkMin: minutes,
    steps: [
      { type: 'walk-final', title: `Walk to ${D.name}`, detail: `From ${O.name}`, start: depMin * MIN_MS, end: t * MIN_MS, minutes, stopId: O.stopId },
      { type: 'arrive', title: `Arrive at ${D.name}`, detail: '', start: t * MIN_MS, end: t * MIN_MS, stopId: D.stopId }
    ],
    chain: [{ kind: 'walk', min: minutes }], lineIds: [], boardingStop: stopById[O.stopId].name, alightStop: stopById[D.stopId].name
  }];
}

// Latest departure (epoch minutes) that still arrives by `target`; null if impossible within 8 hours.
function latestDeparture(path, target, O, D) {
  let lo = target - 480, hi = target - 1, best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (simulate(path, mid, O, D).arrive <= target * MIN_MS) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

let latencyMs = 450;
export const setLatency = ms => { latencyMs = ms; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * query = { originId, destId, mode: 'now'|'depart'|'arrive', whenMs }   (whenMs = epoch ms; for 'now' pass the current time)
 * demo  = optional preview switch: 'error' | 'empty' | 'slow'
 */
export async function findTrips(query, demo) {
  await sleep(demo === 'slow' ? 2500 : latencyMs);
  if (demo === 'error') throw new Error('The demonstration service was asked to fail.');
  if (demo === 'empty') return { trips: [] };
  const O = getPlace(query.originId), D = getPlace(query.destId);
  if (!O || !D) throw new Error('That place is not part of the demonstration network.');
  const whenMin = Math.floor(query.whenMs / MIN_MS);

  if (O.stopId === D.stopId && O.id !== D.id) return { trips: tag(walkOnly(whenMin, O, D)) };
  if (O.stopId === D.stopId) return { trips: [] };

  const paths = enumeratePaths(O.stopId, D.stopId);
  if (!paths.length) return { trips: [] };

  // rank candidates at a reference time, keep the best per line-sequence, then compute the real times
  const ref = query.mode === 'arrive' ? whenMin - 90 : whenMin;
  const byLines = new Map();
  for (const p of paths) {
    const trip = simulate(p, ref, O, D);
    const k = linesKey(p), cur = byLines.get(k);
    if (!cur || trip.arrive < cur.trip.arrive) byLines.set(k, { p, trip });
  }
  const candidates = [...byLines.values()].sort((a, b) => a.trip.arrive - b.trip.arrive).slice(0, 10);
  let trips = [];
  for (const { p } of candidates) {
    if (query.mode === 'arrive') {
      const dep = latestDeparture(p, whenMin, O, D);
      if (dep != null) trips.push(simulate(p, dep, O, D));
    } else trips.push(simulate(p, whenMin, O, D));
  }
  if (!trips.length) return { trips: [] };
  const key = query.mode === 'arrive' ? (t => -t.depart) : (t => t.arrive);   // best first
  trips.sort((a, b) => key(a) - key(b) || a.transfers - b.transfers);
  const best = key(trips[0]);
  trips = trips.filter(t => Math.abs(key(t) - best) <= 40 * MIN_MS).slice(0, 4);
  return { trips: tag(trips) };
}

function tag(trips) {
  trips.forEach((t, i) => { t.id = i; t.tags = []; });
  const mark = (name, score) => {
    const best = Math.min(...trips.map(score));
    const winner = trips.filter(t => score(t) === best).sort((a, b) => a.duration - b.duration)[0];
    winner.tags.push(name);
  };
  if (trips.length > 1) { mark('Fastest', t => t.duration); mark('Fewest transfers', t => t.transfers); mark('Least walking', t => t.walkMin); }
  return trips;
}
