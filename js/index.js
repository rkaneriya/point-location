var _ = require('underscore'); 
var util = require('./util'); 
var kirkpatrick = require('./point-location'); 

var svg = d3.select("#canvas")
.append("svg")
.attr("width", "100%")
.attr("height", "100%");

var drawPoint = function(p, color) { 
    svg.append("circle")
    .attr("cx", p.x + "px")
    .attr("cy", p.y + "px")
    .attr("r", "4px")
    .attr("fill", color); 
}; 

var drawLine = function(a, b, color) { 
    svg.append("line")  
        .attr("stroke-width", 2)
        .attr("stroke", color)
        .attr("x1", a.x)
        .attr("y1", a.y)
        .attr("x2", b.x)
        .attr("y2", b.y);
}; 

var drawTriangle = function(pts, stroke, fill, label) { 
    var s = "M" + pts[0].x + "," + pts[0].y 
    + ", L " + pts[1].x + "," + pts[1].y 
    + ", L " + pts[2].x + "," + pts[2].y 
    + ", Z"; 

    _.each(pts, (p) => drawPoint(p, stroke)); 

    svg.append("path")    
    .attr("stroke-width", "2px")     
    .attr("stroke", stroke)  
    .attr("fill", fill)     
    .attr("d", s);  

    var center = [(pts[0].x + pts[1].x + pts[2].x)/3, (pts[0].y + pts[1].y + pts[2].y)/3]; 

    if (label != undefined) {
        svg.append("text")
        .attr("x", center[0])
        .attr("y", center[1])
        .text(label + "");
    } 
}; 

var highlightTriangle = function(pts, stroke, fill, label) { 
    var s = "M" + pts[0].x + "," + pts[0].y 
    + ", L " + pts[1].x + "," + pts[1].y 
    + ", L " + pts[2].x + "," + pts[2].y 
    + ", Z"; 

    svg.append("path")    
    .attr("stroke-width", "2px")     
    .attr("stroke", stroke)  
    .attr("fill", fill)     
    .attr("d", s);  

    var center = [(pts[0].x + pts[1].x + pts[2].x)/3, (pts[0].y + pts[1].y + pts[2].y)/3]; 

    if (label != undefined) {
        svg.append("text")
        .attr("x", center[0])
        .attr("y", center[1])
        .text(label + "");
    } 
}; 

var drawTriangulation = function(tris, graph) { 
    _.each(tris, function(t) { 
        var tri = graph.all_triangles[t]; 
        var pts = [tri.v1, tri.v2, tri.v3]; 
        pts = _.map(pts, (p) => graph.vertices[p].point); 

        drawTriangle(pts, "gray", "none", t); 
    }); 
}; 

var drawGraph = function(graph, color) { 
    // console.log(graph); 
    // draw all points 
    _.each(graph.vertices, function(v) {
        if (!v.removed) 
            drawPoint(v.point, color);
    }); 

    // draw all edges 
    _.each(graph.adj, function(nbors, i) { 
        // if (!graph.vertices[i].removed) {
            var p1 = graph.vertices[i].point; 
            var p2; 
            _.each(nbors, function(n) { 
                // if (!graph.vertices[n].removed) {
                    p2 = graph.vertices[n].point;
                    drawLine(p1, p2, color); 
                // }
            });
        // }
    }); 
}; 

var buttons = { 
    closePolygon: d3.select("#closePolygon"),
    triangulate: d3.select("#triangulate"),
    findIndependentSet: d3.select("#findIndependentSet"),
    remove: d3.select("#remove"),
    reset: d3.select("#reset"),
    step: d3.select("#step"),
    locateAnother: d3.select("#locateAnother")
}; 

var clear = function() { 
    drawTriangle(kirkpatrick.outer_triangle, "black", "white"); 
};

var reset = function() { 
    buttons.closePolygon.attr("disabled", null); 
    buttons.triangulate.attr("disabled", "disabled"); 
    buttons.findIndependentSet.attr("disabled", "disabled"); 
    buttons.remove.attr("disabled", "disabled");
    buttons.step.attr("disabled", "disabled"); 
    buttons.locateAnother.attr("disabled", "disabled"); 

    points = []; 
    edges = [];  
    step_count = 0; 
    query = undefined; 

    clear(); 

    d3.select("#console").text("Waiting for initial input..."); 

    var handleClick = function() {
        var pt = d3.mouse(this); 
        var p = { x: pt[0], y: pt[1] }; 
        var last; 
        if (!_.isEmpty(points)) { 
            last = { x: _.last(points).x, y: _.last(points).y }; 
        }

        if (util.triangleContainsPoint(p, kirkpatrick.outer_triangle)) {
            if (!_.isEmpty(points)) { 
                var selfCrosses = _.reduce(edges, function(m, e) {
                    return util.sidesIntersect(p, last, e[0], e[1]) || m; 
                }, false); 
            } else { 
                var selfCrosses = false; 
            }

            if (!selfCrosses) { 
                drawPoint(p, "black");
                
                if (!_.isEmpty(points)) { 
                    drawLine(p, last, "black"); 
                    edges.push([p, last]); 
                }    

                points.push(p);
                d3.select("#console").text("Total number of points = " + (points.length + 3)); 
            } else { 
                d3.select("#console").text("No self-crosses allowed!"); 
            }
        }
        else {
            d3.select("#console").text("Outside of triangle!"); 
        }
    };

    svg.on("click", handleClick);
};

reset(); 

var points = []; 
var edges = []; 

var graph; 
var dag; 
var set; 
var query; 
var step_count; 
var highlight; 
var triangulation; 

buttons.closePolygon.on("click", function() { 
    if (points.length < 3) { 
        d3.select("#console").text("Select at least three points!");
    } else { 
        var first = _.first(points); 
        var last = _.last(points); 

        var selfCrosses = _.reduce(edges, function(m, e) { 
            return util.sidesIntersect(first, last, e[0], e[1]) || m;
        }, false);

        if (selfCrosses) { 
            d3.select("#console").text("No self-crosses allowed!");
        } else { 
            drawLine(first, last, "black");
            d3.select("#console").text("Waiting to be triangulated...");
            buttons.closePolygon.attr("disabled", "disabled"); 
            buttons.triangulate.attr("disabled", null); 
        }
    }
}); 

buttons.triangulate.on("click", function() { 
    var res = kirkpatrick.run(points);
    graph = res.graph; 
    dag = res.dag; 
    drawGraph(graph, "black"); 

    d3.select("#console").text("Waiting to be identify independent set...");
    buttons.triangulate.attr("disabled", "disabled"); 
    buttons.findIndependentSet.attr("disabled", null); 
}); 

buttons.findIndependentSet.on("click", function() { 
    set = kirkpatrick.findIndependentSet(graph); 
    _.each(set, (v) => drawPoint(graph.vertices[v].point, "red")); 

    d3.select("#console").text("Waiting to remove independent set...");
    buttons.findIndependentSet.attr("disabled", "disabled"); 
    buttons.remove.attr("disabled", null); 
}); 

buttons.remove.on("click", function() { 
    var tris = kirkpatrick.removeVertices(graph, set, dag); 
    clear(); 
    drawGraph(graph, "black"); 

    if (graph.numVertices == 3) {
        locatePoint(); 
    } else {
        d3.select("#console").text("Waiting to be identify independent set...");
        buttons.findIndependentSet.attr("disabled", null); 
    }

    buttons.remove.attr("disabled", "disabled"); 
}); 

var locatePoint = function() {
    clear();
    step_count = 0;
    query = undefined;  
    d3.select("#console").text("Waiting for query point selection...");
    drawTriangulation(_.first(graph.triangulations), graph); 

    var handleClick = function() { 
        var pt = d3.mouse(this); 
        var p = { x: pt[0], y: pt[1] };
        if (util.triangleContainsPoint(p, kirkpatrick.outer_triangle)) {
            if (query == undefined) { 
                query = p;
                drawPoint(query, "green"); 
                buttons.step.attr("disabled", null); 
                buttons.locateAnother.attr("disabled", "disabled"); 

                highlight = dag.root(); 
                step_count = 1;  
                triangulation = dag.children(highlight); 
            } else { 
                d3.select("#console").text("Query point already selected!");
            }
        } else {
            d3.select("#console").text("Outside of triangle!"); 
        }
    };

    svg.on("click", handleClick); 
}; 

buttons.step.on("click", function() { 
    var len = _.size(graph.triangulations); 
    clear(); 

    if (step_count >= len) { 
        clear();

        d3.select("#console").text("SUCCESS: Point located!");

        drawTriangulation(_.first(graph.triangulations), graph); 
        var tri = graph.all_triangles[highlight]; 
        var pts = [tri.v1, tri.v2, tri.v3]; 
        pts = _.map(pts, (p) => graph.vertices[p].point); 
        drawTriangle(pts, "gray", "yellow", highlight); 
        drawPoint(query, "green");

        buttons.step.attr("disabled", "disabled"); 
        buttons.locateAnother.attr("disabled", null);
        return;

    }

    // highlight containing triangle at current level
    var tri = graph.all_triangles[highlight]; 
    var pts = [tri.v1, tri.v2, tri.v3]; 
    pts = _.map(pts, (p) => graph.vertices[p].point); 
    highlightTriangle(pts, "yellow", "yellow"); 

    var triangulation = graph.triangulations[len - 1 - step_count];
    console.log(triangulation); 
    drawTriangulation(triangulation, graph); 

    // find next highlight 
    if (dag.children(highlight) != undefined) {
        highlight = _.find(dag.children(highlight), function(c) { 
            var t = graph.all_triangles[c]; 
            var pts = [t.v1, t.v2, t.v3]; 
            pts = _.map(pts, (p) => graph.vertices[p].point); 

            return util.triangleContainsPoint(query, pts); 
        }); 
    }

    console.log("next higlight = " + highlight); 
    if (highlight == undefined) { 
        clear();

        d3.select("#console").text("SUCCESS: Point located!");

        drawTriangulation(_.first(graph.triangulations), graph);  
        drawPoint(query, "green");

        buttons.step.attr("disabled", "disabled"); 
        buttons.locateAnother.attr("disabled", null);
        return;
    }

    // re-draw query 
    drawPoint(query, "green");

    while (_.contains(graph.triangulations[len - 1 - step_count], highlight)) {
        step_count++; 
    }
}); 

buttons.locateAnother.on("click", locatePoint); 

buttons.reset.on("click", reset); 