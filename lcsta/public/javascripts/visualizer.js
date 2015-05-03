var current;
function countOccur(array, element){
    var indices = [];
    var idx = array.indexOf(element);
    while (idx != -1) {
      indices.push(idx);
      idx = array.indexOf(element, idx + 1);
    }
    return indices.length;
}

function multipleOccur(array, element){
    var indices = [];
    var idx = array.indexOf(element);
    if (idx == -1)
      return false;
    idx = array.indexOf(element, idx + 1);
    if (idx == -1)
      return false;
    return true;
}

function plotGraph(gGates, gWires, map, connections){
    //var router = '';
    var connector = 'rounded';
    var graphGates = {};
    var graphWires = [];
    var idToIndexMap = [];
    for(var i = 0; i < gGates.length; i++){
           if(gGates[i].dummy)
                continue;
              
           idToIndexMap[gGates[i].id] = i;
           if (!gGates[i].xLayout || !gGates[i].yLayout)
                graphGates[gGates[i].id] = new joint.shapes.logic[map[gGates[i].model]]({position: {x: 60*i, y: 60*i}});
           else
            graphGates[gGates[i].id] = new joint.shapes.logic[map[gGates[i].model]]({position: {x: gGates[i].x, y: gGates[i].y}});
           
        }

        for(var i = 0; i < gWires.length; i++){
            var sourceGate = gGates[i];
            if(sourceGate.dummy)
              continue;
            var gWire = gWires[i];
            for(var l = 0; l < gWire.length; l++){
              var targetGate = gGates[gWire[l]];
              if (!targetGate.dummy){
                     if (targetGate.inputs.length == 1)
                        graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in'},
                                         /*router: {name: router},*/
                                         connector: {name: connector}});
                     else if(targetGate.inputs.length == 2){
                        if(multipleOccur(targetGate.inputs, targetGate.inputs[0])){
                          var firstInputWire = connections[targetGate.inputs[0]];
                          var secondInputWire = connections[targetGate.inputs[1]];
                          var firstInput = gGates[idToIndexMap[firstInputWire.inPort]];
                          var secondInput = gGates[idToIndexMap[secondInputWire.inPort]];
                          if(typeof firstInput !== 'undefined' && firstInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in1'},
                                         /*router: {name: router},*/
                                         connector: {name: connector}});
                          }
                          if (typeof secondInput !== 'undefined' && secondInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in2'},
                                         /*router: {name: router},*/
                                         connector: {name: connector}});
                          }
                        }else{
                          var firstInputWire = connections[targetGate.inputs[0]];
                          var secondInputWire = connections[targetGate.inputs[1]];
                          var firstInput = gGates[idToIndexMap[firstInputWire.inPort]];
                          var secondInput = gGates[idToIndexMap[secondInputWire.inPort]];
                          if(typeof firstInput !== 'undefined' && firstInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in1'},
                                         /*router: {name: router},*/
                                         connector: {name: connector}});
                          }else if (typeof secondInput !== 'undefined' && secondInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in2'},
                                         /*router: {name: router},*/
                                         connector: {name: connector}});
                          }else
                            console.warn('Invalid input ' + targetGate.model);
                        }
                     }
                }else{
                      var wireVerts = [{x: targetGate.x, y: targetGate.y}]
                      var dummyGateIndexIndex = gWire[l];
                      var dummyGateIndex = gWires[dummyGateIndexIndex][0];
                      var targetGate = gGates[dummyGateIndex];
                      while(targetGate.dummy){
                        wireVerts.push({x: targetGate.x, y: targetGate.y});
                        dummyGateIndex = gWires[dummyGateIndex][0];
                        targetGate = gGates[dummyGateIndex];
                      }

                      if (targetGate.inputs.length == 1)
                        graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in'},
                                         connector: {name: connector},
                                         vertices: wireVerts});
                     else if(targetGate.inputs.length == 2){
                        if(multipleOccur(targetGate.inputs, targetGate.inputs[0])){
                          var firstInputWire = connections[targetGate.inputs[0]];
                          var secondInputWire = connections[targetGate.inputs[1]];
                          var firstInput = gGates[idToIndexMap[firstInputWire.inPort]];
                          var secondInput = gGates[idToIndexMap[secondInputWire.inPort]];
                          if(typeof firstInput !== 'undefined' && firstInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in1'},
                                         /*router: {name: router},*/
                                         connector: {name: connector},
                                         vertices: wireVerts});
                          }
                          if (typeof secondInput !== 'undefined' && secondInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in2'},
                                         /*router: {name: router},*/
                                         connector: {name: connector},
                                         vertices: wireVerts});
                          }
                        }else{
                          var firstInputWire = connections[targetGate.inputs[0]];
                          var secondInputWire = connections[targetGate.inputs[1]];
                          var firstInput = gGates[idToIndexMap[firstInputWire.inPort]];
                          var secondInput = gGates[idToIndexMap[secondInputWire.inPort]];
                          if(typeof firstInput !== 'undefined' && firstInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in1'},
                                         connector: {name: connector},
                                         vertices: wireVerts});
                          }else if (typeof secondInput !== 'undefined' && secondInput.id == sourceGate.id){
                              graphWires.push({source: {id: graphGates[sourceGate.id].id, port: 'out'},
                                         target:{id: graphGates[targetGate.id].id, port:'in2'},
                                         connector: {name: connector},
                                         vertices: wireVerts});
                          }else
                            console.warn('Invalid input ' + targetGate.model);
                        }
                     }
                }

            }
        }



        graph.addCells(_.toArray(graphGates));
        _.each(graphWires, function(attributes) { graph.addCell(new joint.shapes.logic.Wire(attributes)) });

        current = initializeSignal();
};

function setPaperDims(width, height){
    if (width > 0 && height > 0 && paper !== 'undefined')
        paper.setDimensions(width, height);
}

function setPaperWidth(width){
    if (width > 0 && paper !== 'undefined')
        paper.setDimensions(width, paper.options.height);
}

function setPaperHeight(height){
    if (height > 0 && paper !== 'undefined')
        paper.setDimensions(paper.options.width, height);
}

function fitView(){
    paper.fitToContent();
    var width = paper.options.width;
    var height = paper.options.height;
    setPaperDims(width + 110, height + 60);
    width += 110;
    height += 60;
    var containerElement = $("#tabs-container");
    var currentWidth = parseFloat(containerElement.css('width'));
    var currentHeight = parseFloat(containerElement.css('height'));
    if (width > currentWidth){
        containerElement.css('min-width', width + 'px');
    }
    if (height > currentHeight){
        containerElement.css('min-height', height + 'px');
    }
}