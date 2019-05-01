BR.LayersTab = BR.ControlLayers.extend({
    previewLayer: null,
    saveLayers: [],

	initialize: function (layersConfig, baseLayers, overlays, options) {
        L.Control.Layers.prototype.initialize.call(this, baseLayers, overlays, options);

        this.layersConfig = layersConfig;
    },

    addTo: function (map) {
        this._map = map;
        this.onAdd(map);

        var layerIndex = BR.layerIndex;

        L.DomUtil.get('layers-control-wrapper').appendChild(this._section);

        this.initButtons();

        var structure = {
            'base-layers': {
                'worldwide-international': [
                    'standard',
                    'OpenTopoMap',
                    'Stamen.Terrain',
                    'Esri.WorldImagery',
                    'wikimedia-map',
                    'HDM_HOT',
                    '1010', // OpenStreetMap.se (Hydda.Full)
                    'opencylemap',
                    '1061', // Thunderforest Outdoors
                    '1065', // Hike & Bike Map
                    '1016', // 4UMaps,
                    'openmapsurfer'
                ],
                'worldwide-monolingual': [
                    'osm-mapnik-german_style',
                    'osmfr',
                    '1017',  // Osmapa.pl - Mapa OpenStreetMap Polska
                    '1023', // kosmosnimki.ru
                    '1021' // sputnik.ru
                ],
                'europe': [
                    'MtbMap',
                    '1069'  // MRI (maps.refuges.info)
                ],
                'europe-monolingual': [
                    'osmfr-basque',
                    'osmfr-breton',
                    'osmfr-occitan'
                ],
                'country': [
                    {
                        'BE': [
                            'osmbe',
                            'osmbe-fr',
                            'osmbe-nl',
                        ]
                    },
                    'OpenStreetMap.CH',
                    'topplus-open',
                    'OpenStreetMap-turistautak',
                    {
                        'IL': [
                            'Israel_Hiking',
                            'Israel_MTB',
                        ]
                    },
                    'mtbmap-no',
                    {
                        'SK': [
                            'Freemap.sk-Car',
                            'Freemap.sk-Hiking',
                            'Freemap.sk-Cyclo',
                        ]
                    },
                    'osm-cambodia_laos_thailand_vietnam-bilingual'
                ]
            },
            'overlays': {
                'worldwide': [
                    'HikeBike.HillShading',
                    'Waymarked_Trails-Cycling',
                    'Waymarked_Trails-Hiking',
                    'Waymarked_Trails-MTB',
                    'mapillary-coverage-raster'
                ],
                'country': [
                    'historic-place-contours',
                    'hu-hillshade',
                    {
                        'PL': [
                            'mapaszlakow-cycle',
                            'mapaszlakow-bike',
                            'mapaszlakow-hike',
                            'mapaszlakow-mtb',
                            'mapaszlakow-incline'
                        ]
                    }
                ]
            }
        };
        var treeData = this.toJsTree(structure);
        var oldSelected = null;

        var onSelectNode = function (e, data) {
            var layerData = layerIndex[data.node.id];
            var selected = data.selected[0];

            if (selected !== oldSelected) {
                this.showPreview(this.createLayer(layerData));
                oldSelected = selected;
            } else {
                data.instance.deselect_node(data.node);
            }
        };

        var onDeselectNode = function (e, data) {
            this.hidePreview();
            oldSelected = null;
        };

        var onCheckNode = function (e, data) {
            var layerData = layerIndex[data.node.id];
            var layer = this.createLayer(layerData);
            var name = layerData.properties.name;
            var overlay = layerData.properties.overlay;

            if (overlay) {
                this.addOverlay(layer, name);
            } else {
                this.addBaseLayer(layer, name);
            }

            this.storeDefaultLayers();
        };

        var onUncheckNode = function (e, data) {
            var obj = this.getLayerById(data.node.id);
            if (!obj) return;

            this.removeLayer(obj.layer);

            if (this._map.hasLayer(obj.layer)) {
                this._map.removeLayer(obj.layer);
                if (!obj.overlay) {
                    this.activateFirstLayer();
                }
            }

            this.storeDefaultLayers();
        };

        $('#optional-layers-tree')
            .on('select_node.jstree', L.bind(onSelectNode, this))
            .on('deselect_node.jstree', L.bind(onDeselectNode, this))
            .on('check_node.jstree', L.bind(onCheckNode, this))
            .on('uncheck_node.jstree', L.bind(onUncheckNode, this))
            .on('ready.jstree', function (e, data) {
                data.instance.open_all();
            })
            .jstree({
                plugins: [ 'checkbox' ],
                checkbox: {
                    whole_node: false,
                    tie_selection: false
                },
                core: {
                    'multiple': false,
                    'themes': {
                        'icons': false,
                        dots : false
                    },
                    'data' : treeData
                }
            });
        this.jstree = $('#optional-layers-tree').jstree(true);

        return this;
    },

    initButtons: function () {
       var expandTree = function (e) {
            this.jstree.open_all();
        };
        var collapseTree = function (e) {
            this.jstree.close_all();
        };

        var toggleOptionalLayers = function (e) {
            var button = L.DomUtil.get('optional_layers_button');
            var treeButtons = L.DomUtil.get('tree-button-group');
            var div = L.DomUtil.get('optional-layers-tree');

            div.hidden = !div.hidden;
            treeButtons.hidden = !treeButtons.hidden;
            button.classList.toggle('active');

            if (div.hidden) {
                this.deselectNode();
            }
        };

        L.DomUtil.get('expand_tree_button').onclick = L.bind(expandTree, this);
        L.DomUtil.get('collapse_tree_button').onclick = L.bind(collapseTree, this);

        L.DomUtil.get('optional_layers_button').onclick = L.bind(toggleOptionalLayers, this);
    },

    toJsTree: function (layerTree) {
        var data = {
            children: []
        };
        var self = this;

        function createRootNode(name) {
            var rootNode = {
                'text': i18next.t('sidebar.layers.category.' + name, name),
                'state': {
                    'disabled': true
                },
                'children': []
            };
            return rootNode;
        }

        function getText(props, parent) {
            var text = '';
            var code = props.country_code || props.language_code;
            if (code && parent.text !== code) {
                text += '<span class="tree-code">' + code + '</span>';
            }
            text += props.name;

            return text;
        }

        function createNode(id, layerData, parent) {
            var props = layerData.properties;
            var url = props.url;
            var keyObj = self.layersConfig.getKeyName(url);
            var childNode = null;

            // when key required only add if configured
            if (!keyObj || keyObj && BR.keys[keyObj.name]) {
                childNode = {
                    'id': id,
                    'text': getText(props, parent),
                    'state': {
                        'checked': self.layersConfig.isDefaultLayer(id, props.overlay)
                    }
                };
            }
            return childNode;
        }

        function walkTree(inTree, outTree) {
            function walkObject(obj) {
                for (name in obj) {
                    var value = obj[name];
                    var rootNode = createRootNode(name)

                    outTree.children.push(rootNode);
                    walkTree(value, rootNode);
                }
            }

            if (Array.isArray(inTree)) {
                for (var i = 0; i < inTree.length; i++) {
                    var entry = inTree[i];
                    if (typeof entry === 'object') {
                        walkObject(entry);
                    } else {
                        var layer = BR.layerIndex[entry];

                        if (layer) {
                            var childNode = createNode(entry, layer, outTree);
                            if (childNode) {
                                outTree.children.push(childNode);
                            }
                        } else {
                            console.error('Layer "' + entry + '" not found');
                        }
                    }
                }
            } else {
                walkObject(inTree);
            }
        }
        walkTree(layerTree, data);

        return data.children;
    },

    storeDefaultLayers: function () {
        var baseLayers = [];
        var overlays = [];

        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            // id set in LayersConfig.createLayer
            var id = obj.layer.id;
            if (id) {
                if (obj.overlay) {
                    overlays.push(id);
                } else {
                    baseLayers.push(id);
                }
            }
        }

        this.layersConfig.storeDefaultLayers(baseLayers, overlays);
    },

    createLayer: function (layerData) {
        var layer = this.layersConfig.createLayer(layerData);
        var overlay = layerData.properties.overlay;

        // preview z-index, like in BR.ControlLayers._addLayer
        layer.options.zIndex = overlay ? this._lastZIndex + 1 : 0;

        return layer;
    },

    getLayerById: function (id) {
        for (var i = 0; i < this._layers.length; i++) {
            var obj = this._layers[i];
            if (obj.layer.id === id) {
                return obj;
            }
        }

        return null;
    },

    getLayerByLegacyName: function (legacyName) {
        var obj = null;
        var id = this.layersConfig.legacyNameToIdMap[legacyName];

        if (id) {
            obj = this.getLayerById(id);
        }

        return obj;
    },

    activateDefaultBaseLayer: function () {
        var index = BR.conf.defaultBaseLayerIndex || 0;
        var activeBaseLayer = this.getActiveBaseLayer();
        if (!activeBaseLayer) {
            this.activateBaseLayerIndex(index);
        }
    },

    saveRemoveActiveLayers: function () {
		this.saveLayers = this.removeActiveLayers();
    },

    restoreActiveLayers: function (overlaysOnly) {
		for (var i = 0; i < this.saveLayers.length; i++) {
            var obj = this.saveLayers[i];

            if (!overlaysOnly || (overlaysOnly && obj.overlay)) {
                var hasLayer = !!this._getLayer(L.Util.stamp(obj.layer));
                if (hasLayer) {
                    if (!this._map.hasLayer(obj.layer)) {
                        this._map.addLayer(obj.layer);
                    }
                } else if (!obj.overlay) {
                    // saved base layer has been removed during preview, select first
                    this.activateFirstLayer();
                }
            }
        }
        this.saveLayers = [];
    },

    removePreviewLayer: function () {
        if (this.previewLayer && this._map.hasLayer(this.previewLayer)) {
            this._map.removeLayer(this.previewLayer);
            this.previewLayer = null;
            return true;
        }
        return false;
    },

    deselectNode: function () {
        var selected = this.jstree.get_selected();
        if (selected.length > 0) {
            this.jstree.deselect_node(selected[0]);
        }
    },

    onBaselayerchange: function () {
        // execute after current input click handler,
        // otherwise added overlay checkbox state doesn't update
        setTimeout(L.Util.bind(function () {
            this.removePreviewLayer();
            this.restoreActiveLayers(true);
            this.deselectNode();
        }, this), 0);
    },

    showPreview: function (layer) {
        this._map.addLayer(layer);
        if (!this.removePreviewLayer()) {
            this.saveRemoveActiveLayers();
            this._map.once('baselayerchange', this.onBaselayerchange, this);
        }
        this.previewLayer = layer;
    },

    hidePreview: function (layer) {
        this._map.off('baselayerchange', this.onBaselayerchange, this);
        this.removePreviewLayer();
        this.restoreActiveLayers();
    }
});

BR.layersTab = function (baseLayers, overlays, options) {
	return new BR.LayersTab(baseLayers, overlays, options);
};
