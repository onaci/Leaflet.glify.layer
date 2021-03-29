import glify from 'leaflet.glify';
import sortWorker from 'web-worker:./sortWorker';

const GlifyLayer = L.Layer.extend({

	/*------------------------------------ LEAFLET SPECIFIC ------------------------------------------*/

	_map: null,

	// the DOM leaflet-pane that contains our layer
	_pane: null,
	_paneName: 'overlayPane',

	_shapesLayer: null,
	_linesLayer: null,
	_pointssLayer: null,

	// user options
	options: {
		types: null,
		geojson: null
	},

	initialize: function (options) {
		L.setOptions(this, options);
	},

	/**
	 * @param map {Object} Leaflet map
	 */
	onAdd: function (map) {
		
		this._map = map;
		if (!this.options.glifyOptions) this.options.glifyOptions = {};
		this.options.glifyOptions.map = this._map;
		this._setPane();
		this.options.glifyOptions.pane = this._paneName;

		this._shapes = [];
		this._lines = [];
		this._points = [];

		this._glifyOptions = {
			border: true,
			opacity: 0.2,
			size: 10,
			color: { r: 0.2, g: 0.5333333333333333, b: 1, a: 0 }
		};

		// merge user options with defaults
		this._glifyOptions = Object.assign(this._glifyOptions, this.options.glifyOptions);	

		if(!this.options.types && this.options.geojson) {
			
			this._separateTypes();
		
		} else if(this.options.types) {
		
			this._shapes = this.options.types.shapes ?  this._clone(this.options.types.shapes) : {};
			this._lines = this.options.types.lines ?  this._clone(this.options.types.lines) : {};
			this._points = this.options.types.points ? this.options.types.points.features.slice().map(f => f.geometry.coordinates) : [];	
			
			this._createLayers();
		
		} else {
			console.error('No geojson or separate types provided.');
			return false;
		}
		
		// callback
		if (this.options.onAdd) this.options.onAdd();
	},

	/**
	 * Remove the pane from DOM, and void pane when layer removed from map
	 */
	onRemove() {
		this.remove();
		if (this.options.onRemove) this.options.onRemove();
	},

	/*------------------------------------ PUBLIC ------------------------------------------*/

	/**
	 * Returns [L.latLngBounds](https://leafletjs.com/reference-1.7.1.html#latlngbounds)
	 * for the L.glify.layer
	 */
	getBounds() {
		let flatCoords = [];
		if (this._shapesLayer) {		
			flatCoords = flatCoords.concat(this._shapes.features.map(f => f.geometry.coordinates[0]).flat());
		}
		if (this._linesLayer) {
			flatCoords = flatCoords.concat(this._lines.features.map(f => f.geometry.coordinates).flat());
		}
		if (this._pointsLayer) {
			flatCoords = flatCoords.concat(this._points);
		}
		return L.latLngBounds(flatCoords.map(c => [c[1], c[0]] ));
	},

	/**
	 * Exec update() on each glify layer
	 * @param {object} data 
	 * @param {number} index 
	 */
	update(data, index) {
		if (this._shapesLayer) this._shapesLayer.update(data, index);
		if (this._linesLayer) this._linesLayer.update(data, index);
		if (this._pointsLayer) this._pointsLayer.update(data, index);
	},

	/** 
	 * Exec remove() on each glify layer
	*/
	remove(index) {
		if (this._shapesLayer) this._shapesLayer.remove(index);
		if (this._linesLayer) this._linesLayer.remove(index);
		if (this._pointsLayer) this._pointsLayer.remove(index);
	},

	/**
	 * Re-render layers
	 */
	render() {
	  if (this._shapesLayer) this._shapesLayer.render();
		if (this._linesLayer) this._linesLayer.render();
		if (this._pointsLayer) this._pointsLayer.render();
	},

	/**
	 * Update layer style options
	 * @param {object} options
	 * @param {boolean} options.border
	 * @param {function|object|string} options.color
	 * @param {number} options.opacity
	 * @param {number} options.size
	 */
	setStyle(options) {
		if (this._shapesLayer) {
			this._shapesLayer.settings = Object.assign(this._shapesLayer.settings, options);
			this._shapesLayer.render();
		}
		if (this._linesLayer) {
			this._linesLayer.settings = Object.assign(this._linesLayer.settings, options);
			this._linesLayer.render();
		}
		if (this._pointsLayer) {
			this._pointsLayer.settings = Object.assign(this._pointsLayer.settings, options);
			this._pointsLayer.render();
		}
	},

	/*------------------------------------ PRIVATE ------------------------------------------*/

	_createLayers(){
		if(this._shapes.features) {
				this._glifyOptions.data = this._shapes;	
				this._shapesLayer = L.glify.shapes(this._glifyOptions);
		}

		// coords for lines and points is inverted..  :`(
		// https://github.com/robertleeplummerjr/Leaflet.glify/issues/78
		// https://github.com/danwild/Leaflet.glify.layer/issues/1
		this._glifyOptions.latitudeKey = 1;
		this._glifyOptions.longitudeKey = 0;

		if(this._lines.features) {
			this._glifyOptions.data = this._lines;	
			this._linesLayer = L.glify.lines(this._glifyOptions);
		}

		if(this._points.length > 0) {
			this._glifyOptions.data = this._points;	
			this._pointsLayer = L.glify.points(this._glifyOptions);
		}
		if (this.options.onLayersInit) this.options.onLayersInit();

		// restore inversion..
		this._glifyOptions.latitudeKey = 0;
		this._glifyOptions.longitudeKey = 1;
	},

	/**
	 * Kick off worker job/s to compute keyframes from features.
	 */
	_separateTypes() {

		const numWorkers = this.options.numWorkers || window.navigator.hardwareConcurrency;
		
		// split features into chunks for worker
		const features = this.options.geojson.features.slice();
		const featureChunks = this._chunkArray(features, numWorkers);
		
		let running = 0;
	
		const workerDone = (e) => {
			running -= 1;

			// features
			this._shapes = this._shapes.concat(e.data.shapes);
			this._lines = this._lines.concat(e.data.lines);
			
			// coords array..
			this._points = this._points.concat(e.data.points);
			
			if(running < 1) {
				this._shapes = { type: "FeatureCollection", features: this._shapes };
				this._lines = { type: "FeatureCollection", features: this._lines };

				this._createLayers();
			}
		}

    for(let i = 0; i < numWorkers; i += 1) {
      running += 1;
      const tWorker = new sortWorker();
      tWorker.onmessage = workerDone;
      tWorker.postMessage({ features: featureChunks[i] });
		}
	},

	/**
	 * Create custom pane if necessary
	 * @private
	 */
	_setPane() {
		// determine where to add the layer
		this._paneName = this.options.paneName || 'overlayPane';

		// fall back to overlayPane for leaflet < 1
		let pane = this._map._panes.overlayPane
		if (this._map.getPane) {
			// attempt to get pane first to preserve parent (createPane voids this)
			pane = this._map.getPane(this._paneName);
			if (!pane) {
				pane = this._map.createPane(this._paneName);
			}
		}

		this._pane = pane;
	},

	/**
	 * Divide an array into n chunks
	 * @param {array} array 
	 * @param {number} parts 
	 */
	_chunkArray(array, parts) {
		let result = [];
		for (let i = parts; i > 0; i--) {
				result.push(array.splice(0, Math.ceil(array.length / i)));
		}
		return result;
	},

	/**
   * Clones the target, unsafe for objects with
   * circular refs
   * @param {object} target
   */
  _clone(target) {
    if (!target) return target;
    return JSON.parse(JSON.stringify(target));
  },

});

L.glify.layer = function (options) {
	return new GlifyLayer(options);
};

export default L.glify.layer;


