$(function(){
  $('#select-geom option[value="draw-point"]').attr('selected', true);

  const source = new ol.source.Vector();
  const vector = new ol.layer.Vector({
      source: source,
  });

  const placedPointsSource = new ol.source.Vector();
  const placedPoints = new ol.layer.Vector({
    source: placedPointsSource
  })

  const map = new ol.Map({
    view: new ol.View({
        center: [0, 0],
        zoom: 1,
    }),
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
      vector,
      placedPoints
    ],
    target: 'map',
  });

  let point, linestring;

  const drawPoint = new ol.interaction.Draw({
    type: "Point",
    source: placedPointsSource,
  });

  drawPoint.on("drawend", function(e){
    point = e.feature.getGeometry();
  });

  //NOTE: geojson lines exported from this program will not appear in QGIS unless they are "MultiLineString" instead of LineString
  const drawPolyline = new ol.interaction.Draw({
    type: "LineString",
    source: source,
  });

  drawPolyline.on("drawend", function(e){
    linestring = e.feature.getGeometry();
  });

  map.addInteraction(drawPoint)

  $('#select-geom').change(function(){
    switch($(this).val()){
      case 'draw-polyline':
        map.removeInteraction(drawPoint);
        map.addInteraction(drawPolyline);
        break;
      case 'draw-point':
        map.removeInteraction(drawPolyline);
        map.addInteraction(drawPoint);
        break;
    }
  });

  $("#submit").click(function(){
    //Find the coords of the linestring that are closest to the point. Make those coords into a point and add it to the map
    const closestPointCoords = linestring.getClosestPoint(point.getCoordinates());
    const closestPointGeom = new ol.geom.Point(closestPointCoords);
    const closestPointFeature = new ol.Feature({geometry: closestPointGeom});
    const closestPointSource = new ol.source.Vector({features: [closestPointFeature]});
    const closestPointLayer = new ol.layer.Vector({source: closestPointSource});
    map.addLayer(closestPointLayer);

    //Create a new linestring with the original segments, but split the segment intersected by the closestPointCoords into two separate segments
    const newLineString = new ol.geom.LineString([]);
    const newLineStringStart = new ol.geom.LineString([]);
    const newLineStringEnd = new ol.geom.LineString([]);
    let temp = newLineStringStart;
    newLineString.appendCoordinate(linestring.getFirstCoordinate());
    temp.appendCoordinate(linestring.getFirstCoordinate())
    linestring.forEachSegment(function(start, end){
      const newLine = new ol.geom.LineString([start, end]);
      if(newLine.intersectsCoordinate(closestPointCoords)){
        temp.appendCoordinate(closestPointCoords);
        temp = newLineStringEnd;
        temp.appendCoordinate(closestPointCoords); // Fix the broken start section Tuesday
        temp.appendCoordinate(end);

        newLineString.appendCoordinate(closestPointCoords);
        newLineString.appendCoordinate(end);
      } else {
        temp.appendCoordinate(end);
        newLineString.appendCoordinate(end);
      }
    });

    //Do the setup to display the new linestring and remove the old linestring.
    const newLineFeature = new ol.Feature({geometry: newLineString});
    const newLineSource = new ol.source.Vector({features: [newLineFeature]});
    const newLineLayer = new ol.layer.Vector({source: newLineSource});

    const newLineFeatureStart = new ol.Feature({geometry: newLineStringStart});
    const newLineSourceStart = new ol.source.Vector({features: [newLineFeatureStart]});
    const newLineLayerStart = new ol.layer.Vector({source: newLineSourceStart});

    var lineStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
          color: 'rgba(255, 0, 0, 1)', // red color
          width: 2
      })
    });
    const newLineFeatureEnd  = new ol.Feature({geometry: newLineStringEnd});
    newLineFeatureEnd.setStyle(lineStyle);
    const newLineSourceEnd = new ol.source.Vector({features: [newLineFeatureEnd]});
    const newLineLayerEnd = new ol.layer.Vector({source: newLineSourceEnd});

    //map.removeLayer(vector);
    map.addLayer(newLineLayerStart);
    map.addLayer(newLineLayerEnd);
    //map.addLayer(newLineLayer);
  });
});
