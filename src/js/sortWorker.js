
/**
 * Sort a features array into geometry types.
 * Points are transformed into array of coords only (for L.glify)
 */

onmessage = function(e) {

  const features = e.data.features;
  const shapes = features.filter(f => f.geometry.type === 'Polygon');
  const lines = features.filter(f => f.geometry.type === 'LineString');
  const points = features.filter(f => f.geometry.type === 'Point').map(f => f.geometry.coordinates);
  
  postMessage({ shapes, lines, points });
}

