$(function(){
  $('#select-geom option[value="draw-point"]').attr('selected', true);

  // Used for storing lines from the draw interactions
  const source = new ol.source.Vector();
  const vector = new ol.layer.Vector({
      source: source,
  });

  // Used for storing points from the draw interactions
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

  // All points and lines are big for the example. Change radius and width to make more visually appealing
  const pointStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 8, 
      fill: new ol.style.Fill({color: 'red'}),
      stroke: new ol.style.Stroke({color: 'black', width: 1})
    })
  });

  const lineStyleStart = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'red',
        width: 8
    })
  });

  const lineStyleEnd = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: 'green',
        width: 8
    })
  });

  const drawPoint = new ol.interaction.Draw({
    type: "Point",
    style: pointStyle,
    source: placedPointsSource,
  });

  const drawPolyline = new ol.interaction.Draw({
    type: "LineString",
    source: source,
  });

  let point, linestring;

  drawPoint.on("drawend", function(e){
    point = e.feature.getGeometry();
    e.feature.setStyle(pointStyle)
  });

  drawPolyline.on("drawend", function(e){
    linestring = e.feature.getGeometry();
  });

  map.addInteraction(drawPoint);

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
    // Find the coords of the linestring that are closest to the point. Make those coords into a point and add it to the map
    const closestFeature = source.getClosestFeatureToCoordinate(point.getCoordinates());
    const closestLine = closestFeature.getGeometry();
    const closestPointCoords = closestLine.getClosestPoint(point.getCoordinates());
    const closestPointGeom = new ol.geom.Point(closestPointCoords);
    const closestPointFeature = new ol.Feature({geometry: closestPointGeom});
    const closestPointSource = new ol.source.Vector({features: [closestPointFeature]});
    const closestPointLayer = new ol.layer.Vector({source: closestPointSource});
    map.addLayer(closestPointLayer);

    // Create a new linestring with the original segments, but split the segment intersected by the closestPointCoords into two separate segments
    const newLineStringStart = new ol.geom.LineString([]);
    const newLineStringEnd = new ol.geom.LineString([]);
    newLineStringStart.appendCoordinate(closestLine.getFirstCoordinate());

    // Build the start and end linestrings
    let lineStartFlag = true;
    closestLine.forEachSegment(function(start, end){
      const newLine = new ol.geom.LineString([start, end]);
      // If line intersects closestPoint flip the flag and start building the end line
      if(newLine.intersectsExtent(ol.extent.buffer(closestPointGeom.getExtent(), .0000001))){ // I chose to use intersectsExtent here, but intersectsCoordinate should be slightly simpler and work just as well
        newLineStringStart.appendCoordinate(closestPointCoords);

        newLineStringEnd.appendCoordinate(closestPointCoords);
        newLineStringEnd.appendCoordinate(end);

        lineStartFlag=false;
      } else if(lineStartFlag){
        newLineStringStart.appendCoordinate(end);
      } else {
        newLineStringEnd.appendCoordinate(end);
      }
    });

    // Make lines into features, style them, and then put them in a layer to display on map
    const newLineFeatureStart = new ol.Feature({geometry: newLineStringStart});
    newLineFeatureStart.setStyle(lineStyleStart);
    const newLineSourceStart = new ol.source.Vector({features: [newLineFeatureStart]});
    const newLineLayerStart = new ol.layer.Vector({source: newLineSourceStart});

    const newLineFeatureEnd  = new ol.Feature({geometry: newLineStringEnd});
    newLineFeatureEnd.setStyle(lineStyleEnd);
    const newLineSourceEnd = new ol.source.Vector({features: [newLineFeatureEnd]});
    const newLineLayerEnd = new ol.layer.Vector({source: newLineSourceEnd});

    map.addLayer(newLineLayerStart);
    map.addLayer(newLineLayerEnd);
  });
});
