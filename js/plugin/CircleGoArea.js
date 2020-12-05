BR.CircleGoArea = L.Control.extend({
    circleLayer: null,
    outsideAreaRenderer: L.svg({ padding: 1 }),

    options: {
        radius: 1000, // in meters
        shortcut: {
            draw: {
                enable: 73, // char code for 'i'
                disable: 27, // char code for 'ESC'
            },
        },
    },
    initialize: function (routing, nogos, pois) {
        this.routing = routing;
        this.nogos = nogos;
        this.pois = pois;
    },

    onAdd: function (map) {
        var self = this;

        this.map = map;
        this.circleLayer = L.layerGroup([]).addTo(map);

        var radiusKm = (this.options.radius / 1000).toFixed();
        this.drawButton = L.easyButton({
            states: [
                {
                    stateName: 'activate-circlego',
                    icon: 'fa-circle-o',
                    onClick: function () {
                        self.draw(true);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: i18next.t('map.draw-circlego-start', { radius: radiusKm }),
                        key: 'I',
                    }),
                },
                {
                    stateName: 'deactivate-circlego',
                    icon: 'fa-circle-o active',
                    onClick: function () {
                        self.draw(false);
                    },
                    title: i18next.t('keyboard.generic-shortcut', {
                        action: i18next.t('map.draw-circlego-stop', { radius: radiusKm }),
                        key: '$t(keyboard.escape)',
                    }),
                },
            ],
        });

        map.on('routing:draw-start', function () {
            self.draw(false);
        });

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);

        var container = new L.DomUtil.create('div');
        return container;
    },

    draw: function (enable) {
        this.drawButton.state(enable ? 'deactivate-circlego' : 'activate-circlego');
        if (enable) {
            this.routing.draw(false);
            this.pois.draw(false);
            this.map.on('click', this.onMapClick, this);
            L.DomUtil.addClass(this.map.getContainer(), 'circlego-draw-enabled');
        } else {
            this.map.off('click', this.onMapClick, this);
            L.DomUtil.removeClass(this.map.getContainer(), 'circlego-draw-enabled');
        }
    },

    _keydownListener: function (e) {
        if (!BR.Util.keyboardShortcutsAllowed(e)) {
            return;
        }
        if (e.keyCode === this.options.shortcut.draw.disable) {
            this.draw(false);
        } else if (e.keyCode === this.options.shortcut.draw.enable) {
            this.draw(true);
        }
    },

    setNogoCircle: function (center) {
        if (center) {
            var polygon = this.circleToPolygon(center, this.options.radius);
            var geoJson = JSON.stringify(polygon);
            $('#nogoJSON').val(geoJson);
            $('#nogoBuffer').val(0);
            this.nogos.uploadNogos();

            var polygonClone = JSON.parse(geoJson);
            this.setOutsideArea(polygonClone);
        } else {
            this.nogos.clear();
            this.map.removeLayer(this.outsideArea);
        }
    },

    setOutsideArea: function (polygon) {
        var inner = polygon.features[0].geometry.coordinates.concat(polygon.features[1].geometry.coordinates);
        var world = [
            [180, 90],
            [-180, 90],
            [-180, -90],
            [180, -90],
            [180, 90],
        ];
        polygon.features[0].geometry.coordinates = [world, inner];
        polygon.features[0].geometry.type = 'Polygon';
        polygon.features.pop();

        if (this.outsideArea) {
            this.map.removeLayer(this.outsideArea);
        }

        this.outsideArea = L.geoJson(polygon, {
            renderer: this.outsideAreaRenderer,
            style: function (feature) {
                return {
                    weight: 2,
                    color: 'black',
                    opacity: 0.4,
                    fillColor: 'black',
                    fillOpacity: 0.4,
                    className: 'circlego-outside',
                };
            },
        })
            .on('click', L.DomEvent.stop)
            .addTo(this.map);
    },

    onMapClick: function (e) {
        this.setCircle([e.latlng.lng, e.latlng.lat], false);
    },

    setCircle: function (center, skipNogo) {
        var self = this;
        var icon = L.VectorMarkers.icon({
            icon: 'home',
            markerColor: BR.conf.markerColors.circlego,
        });
        var marker = L.marker([center[1], center[0]], { icon: icon, draggable: true, name: name })
            .on('dragend', function (e) {
                self.setNogoCircle([e.target.getLatLng().lng, e.target.getLatLng().lat]);
            })
            .on('click', function () {
                var drawing = self.drawButton.state() == 'deactivate-circlego';
                if (drawing) {
                    self.circleLayer.removeLayer(marker);
                    self.setNogoCircle(undefined);
                }
            });

        this.clear();
        marker.addTo(this.circleLayer);
        if (!skipNogo) {
            this.setNogoCircle(center);
        } else {
            var polygon = this.circleToPolygon(center, this.options.radius);
            this.setOutsideArea(polygon);
        }
        this.draw(false);
    },

    clear: function () {
        this.circleLayer.clearLayers();
    },

    getButton: function () {
        return this.drawButton;
    },

    getCircle: function () {
        var circle = this.circleLayer.getLayers().map(function (it) {
            return it.getLatLng();
        });
        if (circle && circle.length) {
            return [circle[0].lng.toFixed(6), circle[0].lat.toFixed(6), this.options.radius].join(',');
        } else {
            return null;
        }
    },

    toRadians: function (angleInDegrees) {
        return (angleInDegrees * Math.PI) / 180;
    },

    toDegrees: function (angleInRadians) {
        return (angleInRadians * 180) / Math.PI;
    },

    offset: function (c1, distance, bearing) {
        var lon1 = this.toRadians(c1[0]);
        var lat1 = this.toRadians(c1[1]);
        var dByR = distance / 6378137; // distance divided by 6378137 (radius of the earth) wgs84
        var lat = Math.asin(Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing));
        var lon =
            lon1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
                Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat)
            );
        return [this.toDegrees(lon), this.toDegrees(lat)];
    },

    circleToPolygon: function (center, radius, numberOfSegments) {
        var n = numberOfSegments ? numberOfSegments : 32;

        var inner = [];
        for (var i = 0; i < n; ++i) {
            inner.push(this.offset(center, radius, (2 * Math.PI * -i) / n));
        }
        inner.push(inner[0]);

        /* hack: it seems there is a bug when using a single closed ring line,
         cf. https://github.com/nrenner/brouter-web/issues/349#issue-755514458
         so instead we use 2 half rings to ensure we properly close the area */
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: inner.slice(n / 2 - 1),
                    },
                },
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: inner.slice(0, n / 2 + 1),
                    },
                },
            ],
        };
    },
});

BR.CircleGoArea.include(L.Evented.prototype);
