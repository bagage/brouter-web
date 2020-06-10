BR.tracksLoader = function(map, layersControl, routing) {
    TracksLoader = L.Control.FileLayerLoad.extend({
        options: {
            layer: L.geoJson,
            layerOptions: {
                style: function(geoJsonFeature) {
                    var currentLayerId = layersControl.getActiveBaseLayer().layer.id;
                    return {
                        color: currentLayerId === 'cyclosm' ? 'yellow' : 'blue',
                        weight: 4
                    };
                },
                interactive: false,
                pointToLayer: function(geoJsonPoint, latlng) {
                    return L.marker(latlng, {
                        interactive: false,
                        opacity: 0.7,
                        // prevent being on top of route markers
                        zIndexOffset: -1000
                    });
                }
            },
            addToMap: false,
            // File size limit in kb (default: 1024) ?
            fileSizeLimit: 1024
        },

        _initContainer: function() {
            var thisLoader = this.loader;

            var fileInput;
            var container = L.DomUtil.get('navbarLoadTracksContainer');

            // Create an invisible file input
            fileInput = L.DomUtil.create('input', 'hidden', container);
            fileInput.type = 'file';
            fileInput.multiple = 'multiple';
            if (!this.options.formats) {
                fileInput.accept = '.gpx,.kml,.json,.geojson';
            } else {
                fileInput.accept = this.options.formats.join(',');
            }
            fileInput.style.display = 'none';
            // Load on file change
            fileInput.addEventListener(
                'change',
                function() {
                    thisLoader.loadMultiple(this.files);
                    // reset so that the user can upload the same file again if they want to
                    this.value = '';
                },
                false
            );

            var link = L.DomUtil.get('navbarLoadTracks');
            L.DomEvent.disableClickPropagation(link);
            L.DomEvent.on(link, 'click', function(e) {
                fileInput.click();
                e.preventDefault();
            });
            // dummy, no own representation, triggered in loading menu
            var dummy = L.DomUtil.create('div');
            dummy.hidden = true;
            return dummy;
        }
    });
    var tracksLoaderControl = new TracksLoader();
    tracksLoaderControl.addTo(map);

    tracksLoaderControl.loader.on('data:loaded', function(event) {
        var eventLayer = event.layer,
            routingMarkers = [];
        /* disabled for now, see issue #254
        for (var layerIdx = 0; layerIdx < eventLayer.getLayers().length; layerIdx++) {
            var layer = eventLayer.getLayers()[layerIdx];
            if (layer.feature && layer.feature.properties && layer.feature.properties.type) {
                var layerType = layer.feature.properties.type;
                if (layerType === 'from' || layerType === 'via' || layerType === 'to') {
                    routingMarkers.push(layer.getLatLng());
                }
            }
        }
        if (routingMarkers.length > 0) {
            routing.setWaypoints(routingMarkers, function(event) {
                var err = event.error;
                BR.message.showError(
                    i18next.t('warning.tracks-load-error', {
                        error: err && err.message ? err.message : err
                    })
                );
            });
        }
        */
        layersControl.addOverlay(eventLayer, event.filename);
        eventLayer.addTo(map);
    });

    tracksLoaderControl.loader.on('data:error', function(event) {
        var err = event.error;
        BR.message.showError(
            i18next.t('warning.tracks-load-error', {
                error: err && err.message ? err.message : err
            })
        );
    });

    return tracksLoaderControl;
};
