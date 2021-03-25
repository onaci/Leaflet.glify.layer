# leaflet-glify-layer [![NPM version][npm-image]][npm-url] [![NPM Downloads][npm-downloads-image]][npm-url]

Add-on for the [Leaflet.glify](https://github.com/robertleeplummerjr/Leaflet.glify) plugin to provide more leaflet-idiomatic bindings.

Together this provides fast webgl rendering for GeoJSON FeatureCollections (currently limited to polygons, lines and points).

wow, very data
![Screenshot](/screenshots/screenshot.png?raw=true)

## why use this plugin? 

The `leaflet-glify` plugin is great 🙏🙏 but does not behave like a typical leaflet layer, e.g.

- unlike the [L.geoJSON](https://leafletjs.com/reference-1.7.1.html#geojson) layer, GeoJSON polygons/points/lines must be created and managed as separate layers, which can quickly become unmanageable
- common functions like `layer.addTo(map)`, `map.removeLayer(layer)` don't work 'the leaflet way'
- polygons and points/lines have inconsistent coordinate ordering (GeoJSON convention is `[lng,lat]`)
- missing other convienience methods (e.g. `layer.getBounds`)
- default styling is very inconsistent with leaflet


## install
```shell
npm install leaflet-glify-layer --save
```

## use

This plugin acts as an add-on for `L.glify`, to managing the various L.glify layers required if you provide mutiple geometry types, and providing other leaflet-iodomatic methods/bindings.

Most importantly - GeoJSON can either be provided as:

1. A single `FeatureCollection` containing features of mixed geometry types
  - this is slower as features must be sorted into types; however
  - sorting uses web workers to avoid blocking main thread
2. A `FeatureCollection` for each geometry type (faster)

**Note:** L.glify expects points as an array of coords rather than GeoJSON features, so for now - the full GeoJSON object/properties are lost.. 😞

```javascript
const myLayer = L.glify.layer({
  
  // Option #1. A single GeoJSON FeatureCollection that needs to be sorted
  geojson: {},

  // Option #2. -> FeatureCollection's that are pre-sorted by type 
  type: { 
    shapes: {}, // FeatureCollection of Polygon's
    lines: {},  // FeatureCollection of LineString's
    points: {}, // FeatureCollection of Point's
  },
  // L.glify options - currently a single set
  // of options is used for all geometry types
  glifyOptions: {
    // defaults vaguely match leaflet
    border: true,
    opacity: 0.2,
    size: 10
  }

  // OPTIONAL - supply the name of a custom pane,
  // will be created if doesn't exist, defaults to overlayPane
  // (used by L.glify as `pane` option)
  // https://leafletjs.com/reference-1.6.0.html#map-pane
  paneName: "overlayPane",
  
  // OPTIONAL - callback to be notified when types 
  // have been sorted, L.glify will be created
  onTypesReady() {},

  // OPTIONAL - callbacks when layer is added/removed from map
  onAdd: function(){},
  onRemove: function(){},
});

myLayer.addToMap(map);
```

## public methods

|method|params|description|
|---|---|---|
|`setStyle`|options: `{ color, border, opacity, size}`|Updates style settings|
|`getBounds`||Returns [L.latLngBounds](https://leafletjs.com/reference-1.7.1.html#latlngbounds) for the `L.glify.layer`|
|`render`||Force re-render|
|`update`|`(data, index)`|Calls [update](https://github.com/robertleeplummerjr/Leaflet.glify#update--remove-data) on L.glify layers|
|`remove`|`(index)`|Calls [remove](https://github.com/robertleeplummerjr/Leaflet.glify#update--remove-data) on L.glify layers|


## development
```shell
npm install 
npm run build
```

## thanks
- https://github.com/robertleeplummerjr/Leaflet.glify
- http://bl.ocks.org/Sumbera/c6fed35c377a46ff74c3
- https://github.com/mapbox/earcut

[npm-image]: https://badge.fury.io/js/leaflet-glify-layer.svg
[npm-url]: https://www.npmjs.com/package/leaflet-glify-layer
[npm-downloads-image]: https://img.shields.io/npm/dt/leaflet-glify-layer.svg