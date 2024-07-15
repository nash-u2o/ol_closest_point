$(function(){
  const map = new ol.Map({
    view: new ol.View({
        center: [0, 0],
        zoom: 1,
    }),
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
    ],
    target: 'map',
  });

  map.getViewport().addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  
  map.getViewport().addEventListener('drop', (event) => {
    // Get the files and slice the extension out of the filename
    event.preventDefault();
    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; ++i) {
      // Slice the extension out of the filename
      const file = files.item(i);
      const fileName = file.name;
      const extension = fileName.slice(fileName.lastIndexOf(".") + 1);

      switch (extension){
        case "geojson":
          var reader = new FileReader();
          reader.onload = (e) => {
            //Load the features from the geojson
            const geojsonData = JSON.parse(e.target.result);
            const features = new ol.format.GeoJSON().readFeatures(geojsonData);

            //Assuming we are taking in a linestring and point for this example
            let linestring, point;
            for(let i = 0; i < Object.keys(features).length; i++){
              let feature = features[Object.keys(features)[i]];
              if(feature.getGeometry() instanceof ol.geom.Point){
                point = feature;
              } else if(feature.getGeometry() instanceof ol.geom.LineString){
                linestring = feature;
              }
            }

            //Create separate sources for the linestring and the point
            const lineSource = new ol.source.Vector({
              features: [linestring]
            });
            const pointSource = new ol.source.Vector({
              features: [point]
            });

            //Also create separate layers
            const lineLayer = new ol.layer.Vector({
              source: lineSource
            });
            const pointLayer = new ol.layer.Vector({
              source: pointSource
            });

            map.addLayer(lineLayer);
            map.addLayer(pointLayer);

            //Find the coords of the linestring that are closest to the point. Make those coords into a point and add it to the map
            const closestPointCoords = linestring.getGeometry().getClosestPoint(point.getGeometry().getCoordinates());
            const closestPointGeom = new ol.geom.Point(closestPointCoords);
            const closestPointFeature = new ol.Feature({geometry: closestPointGeom});
            const closestPointSource = new ol.source.Vector({features: [closestPointFeature]});
            const closestPointLayer = new ol.layer.Vector({source: closestPointSource});
            map.addLayer(closestPointLayer);

            //Create a new linestring with the original segments, but split the segment intersected by the closestPointCoords into two separate segments
            const newLineString = new ol.geom.LineString([]);
            const line2 = new ol.geom.LineString([])
            newLineString.appendCoordinate(linestring.getGeometry().getFirstCoordinate());
            linestring.getGeometry().forEachSegment(function(start, end){
              const newLine = new ol.geom.LineString([start, end]);
              if(newLine.intersectsCoordinate(closestPointCoords)){
                newLineString.appendCoordinate(closestPointCoords);
                newLineString.appendCoordinate(end);

                line2.appendCoordinate(closestPointCoords)
                line2.appendCoordinate(end)
              } else {
                newLineString.appendCoordinate(end);
              }
            });

            //Do the setup to display the new linestring and remove the old linestring.
            const newLineFeature = new ol.Feature({geometry: newLineString});
            const newLineSource = new ol.source.Vector({features: [newLineFeature]});
            const newLineLayer = new ol.layer.Vector({source: newLineSource});
            map.removeLayer(lineLayer);
            map.addLayer(newLineLayer);

          };
          reader.readAsText(file);
          break;
      }
    }
  });
});