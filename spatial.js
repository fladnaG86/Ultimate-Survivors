// ═══════════════════════════════════════════════════
//  Ultimate Survivor — spatial.js  (Spatial Grid)
// ═══════════════════════════════════════════════════

const SPATIAL_CELL = 200;
const SPATIAL_CELL_INV = 1 / SPATIAL_CELL;

// ── Dynamic grid (rebuilt each frame for moving entities) ──
const _grid = new Map();
let _gridFrame = 0;

function _gridKey(cx, cy) { return (cx + 50000) * 100000 + (cy + 50000); }

function spatialClear() {
  if (_grid.size > 2000) { _grid.clear(); }
  else { for (const k of _grid.keys()) _grid.delete(k); }
}

function spatialInsert(entity) {
  const cx = (entity.x * SPATIAL_CELL_INV) | 0;
  const cy = (entity.y * SPATIAL_CELL_INV) | 0;
  const key = _gridKey(cx, cy);
  let bucket = _grid.get(key);
  if (!bucket) { bucket = []; _grid.set(key, bucket); }
  bucket.push(entity);
}

function spatialRebuild(entities) {
  spatialClear();
  for (let i = 0; i < entities.length; i++) spatialInsert(entities[i]);
}

// Returns an array of entities in cells overlapping the circle (x,y,radius)
// Caller should NOT modify the returned array.
const _nearbyBuf = [];
let _nearbyLen = 0;

function spatialNearby(x, y, radius) {
  _nearbyLen = 0;
  const minCx = ((x - radius) * SPATIAL_CELL_INV) | 0;
  const maxCx = ((x + radius) * SPATIAL_CELL_INV) | 0;
  const minCy = ((y - radius) * SPATIAL_CELL_INV) | 0;
  const maxCy = ((y + radius) * SPATIAL_CELL_INV) | 0;
  const rSq = radius * radius;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const bucket = _grid.get(_gridKey(cx, cy));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const e = bucket[i];
        const dx = e.x - x, dy = e.y - y;
        if (dx * dx + dy * dy <= rSq) {
          if (_nearbyLen < _nearbyBuf.length) _nearbyBuf[_nearbyLen] = e;
          else _nearbyBuf.push(e);
          _nearbyLen++;
        }
      }
    }
  }
  return _nearbyBuf;
}

function spatialNearbyCount() { return _nearbyLen; }

// ── Static grid for obstacles (built once) ──
const _obsGrid = new Map();

function spatialBuildObstacles(obsList) {
  _obsGrid.clear();
  for (let i = 0; i < obsList.length; i++) {
    const obs = obsList[i];
    const r = obs.radius + 20; // margin for collision checks
    const minCx = ((obs.x - r) * SPATIAL_CELL_INV) | 0;
    const maxCx = ((obs.x + r) * SPATIAL_CELL_INV) | 0;
    const minCy = ((obs.y - r) * SPATIAL_CELL_INV) | 0;
    const maxCy = ((obs.y + r) * SPATIAL_CELL_INV) | 0;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = _gridKey(cx, cy);
        let bucket = _obsGrid.get(key);
        if (!bucket) { bucket = []; _obsGrid.set(key, bucket); }
        bucket.push(obs);
      }
    }
  }
}

const _obsNearbyBuf = [];
let _obsNearbyLen = 0;

function spatialObstaclesNearby(x, y, radius) {
  _obsNearbyLen = 0;
  const minCx = ((x - radius) * SPATIAL_CELL_INV) | 0;
  const maxCx = ((x + radius) * SPATIAL_CELL_INV) | 0;
  const minCy = ((y - radius) * SPATIAL_CELL_INV) | 0;
  const maxCy = ((y + radius) * SPATIAL_CELL_INV) | 0;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const bucket = _obsGrid.get(_gridKey(cx, cy));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        if (_obsNearbyLen < _obsNearbyBuf.length) _obsNearbyBuf[_obsNearbyLen] = bucket[i];
        else _obsNearbyBuf.push(bucket[i]);
        _obsNearbyLen++;
      }
    }
  }
  return _obsNearbyBuf;
}

function spatialObstaclesNearbyCount() { return _obsNearbyLen; }