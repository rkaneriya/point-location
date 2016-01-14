/* 
    Contains code for Planar Graph, triangulation, finding independent sets, 
    and removing vertices from graph (creating DAG structure) 
*/

var _ = require('underscore'); 
var earcut = require('earcut'); 
var util = require('./util'); 
var DAG = require('./dag'); 

var PlanarGraph = function() {
    // parallel arrays 
    this.vertices = []; 
    this.adj = [];  
    this.all_triangles = []; // all distinct triangles created 
    this.triangulations = []; // array of lists containing triangulations at each level (triangle ids)
    this.numVertices = 0; 
}; 

var Point = function(a, b) { 
    this.x = a; 
    this.y = b; 
};  

var Vertex = function(a, b) {
    this.id = -1;   
    this.point = new Point(a, b);  
    this.triangles = [];
    this.removed = false; 
}; 

// creates triangle from 3 vertex ids   
var Triangle = function(a, b, c) { 
    this.v1 = a; 
    this.v2 = b; 
    this.v3 = c; 
}; 

Vertex.prototype.addTriangle = function(triangle_id) { 
    if (!_.contains(this.triangles, triangle_id)) { 
        this.triangles.push(triangle_id); 
    }
};

Vertex.prototype.removeTriangle = function(triangle_id) { 
    this.triangles = _.reject(this.triangles, function(t) { return t == triangle_id; }); 
}; 

PlanarGraph.prototype.addVertex = function(a, b) {
    var v = new Vertex(a, b);
    v.id = this.vertices.length;

    this.vertices.push(v);
    this.adj.push([]); 
    this.numVertices++; 

    return v.id; 
};

PlanarGraph.prototype.neighbors = function(v) { 
    return this.adj[v]; 
}; 

PlanarGraph.prototype.degree = function(v) {
    return this.adj[v].length;
};

// will only add to adj lists of both if not already present 
PlanarGraph.prototype.connect = function(v1, v2) {  
    if (!_.contains(this.adj[v1], v2) && !_.contains(this.adj[v2], v1)) {
        this.addDirectedEdge(v1, v2); 
        this.addDirectedEdge(v2, v1); 
    }   
};

PlanarGraph.prototype.addDirectedEdge = function(v1, v2) {
    this.adj[v1].push(v2); 
};

PlanarGraph.prototype.removeDirectedEdge = function(v1, v2) { 
    this.adj[v1] = _.reject(this.adj[v1], function(v) { return v == v2; }); 
};  

// removes the vertex from its connections in the graph
// returns array of old triangle ids and array of bounding vertex ids (polygon to be re-triangulated)
PlanarGraph.prototype.removeVertex = function(v) { 
    this.vertices[v].removed = true; 
    this.numVertices--;

    var neighbors = this.adj[v]; 
    var self = this; 

    // remove edges from v to neighbors 
    _.each(neighbors, function(n) { 
        self.removeDirectedEdge(v, n); 
        self.removeDirectedEdge(n, v); 
    }); 

    // copy v's triangles (old triangles)
    var old_triangle_ids = _.map(this.vertices[v].triangles, function(t) { return t; }); 

    var polygon = []; 

    // array of arrays of vertex ids (without v)
    var triangles = _.map(this.vertices[v].triangles, function(t_id) { 
        var t = self.all_triangles[t_id]; 
        return _.reject(_.values(t), function(v2) { return v2 == v; });          
    }); 

    // collect bounding vertices in CW order (polygon to be re-triangulated)
    var next = _.first(triangles);
    polygon.push(_.first(next)); 
    var query = _.last(next); 
    polygon.push(query);  
    triangles = _.rest(triangles, 1); 
    for (var i = 0; i < neighbors.length-2; i++) { 
        // find element with query 
        var next = _.find(triangles, function(t) { return _.contains(t, query); });
        var old_query = query; 
        var query = (_.first(next) == query) ? _.last(next) : _.first(next); 
        polygon.push(query); 
        triangles = _.reject(triangles, function(t) { return _.contains(t, old_query); });  
    }

    // go through v's triangles, remove each from all participating vertices 
    _.each(old_triangle_ids, function(t_id) { 
        var t = self.all_triangles[t_id]; 
        self.vertices[t.v1].removeTriangle(t_id); 
        self.vertices[t.v2].removeTriangle(t_id);
        self.vertices[t.v3].removeTriangle(t_id); 
    }); 

    return { 
        old_triangles: old_triangle_ids,
        polygon: polygon
    };
}; 

PlanarGraph.prototype.removeDirectedEdge = function(v1, v2) { 
    this.adj[v1] = _.reject(this.adj[v1], function(v) { return v == v2; }); 
};  

/* TRIANGULATION FUNCTIONS */ 

// input = graph and array of vertex ids, output = array of arrays of triangles (vertex ids)
var getTriangulation = function(graph, polygon, hole) { 
    var input = []; 

    _.each(polygon, function(v) { 
        input.push(graph.vertices[v].point.x); 
        input.push(graph.vertices[v].point.y); 
    }); 

    var triangulations; 
    if (hole != null) { 
        var hole_index = input.length / 2; 
        _.each(hole, function(v) { 
            input.push(graph.vertices[v].point.x); 
            input.push(graph.vertices[v].point.y); 
        }); 

        triangulations = earcut(input, [hole_index]); 
    } else { 
        triangulations = earcut(input); 
    }
    
    var output = []; 
    for (var i = 0; i < triangulations.length; i += 3) { 
        var id1 = triangulations[i]; 
        var id2 = triangulations[i+1];
        var id3 = triangulations[i+2];

        var p1 = (id1 < polygon.length) ? polygon[id1] : hole[id1 - polygon.length];
        var p2 = (id2 < polygon.length) ? polygon[id2] : hole[id2 - polygon.length];
        var p3 = (id3 < polygon.length) ? polygon[id3] : hole[id3 - polygon.length];

        output.push([p1, p2, p3]); 
    }

    return output; 
}; 

// input = graph and array of vertex ids, output = array of new triangle ids s
var triangulate = function(graph, polygon, hole) {
    var triangles = getTriangulation(graph, polygon, hole); 
    var new_triangle_ids = []; 

    _.each(triangles, function(t) { 
        // connect all three vertices in triangle 't' 
        graph.connect(t[0], t[1]);
        graph.connect(t[1], t[2]); 
        graph.connect(t[2], t[0]); 

        // create new triangle 
        var tri = new Triangle(t[0], t[1], t[2]);
        var triangle_id = graph.all_triangles.length; 
        new_triangle_ids.push(triangle_id);  
        graph.all_triangles.push(tri); 

        // add new triangle to each of the three vertices' lists 
        graph.vertices[t[0]].addTriangle(triangle_id); 
        graph.vertices[t[1]].addTriangle(triangle_id); 
        graph.vertices[t[2]].addTriangle(triangle_id); 
    }); 

    return new_triangle_ids; 
}; 

/* ACTIONS RELATED TO INDEX.JS */ 

var outer_triangle = [{ x: 325, y: 5 }, { x: 650, y: 650 }, { x: 5, y: 650 }]; 

// input = array of Points, output = resulting graph (w/ outer triangle) 
var run = function(pts) { 
    var graph = new PlanarGraph(); 
    var polygon = []; 

    _.each(pts, function(p, i) { 
        graph.addVertex(p.x, p.y); 
        if (i != 0) { 
            graph.connect(i, i-1); 
        }
        polygon.push(i); 
    }); 

    graph.connect(0, pts.length-1);

    var inner_triangles = triangulate(graph, polygon); 
    // add outer triangle 
    graph.addVertex(outer_triangle[0].x, outer_triangle[0].y); 
    graph.addVertex(outer_triangle[1].x, outer_triangle[1].y); 
    graph.addVertex(outer_triangle[2].x, outer_triangle[2].y); 

    graph.connect(pts.length, pts.length+1); 
    graph.connect(pts.length+1, pts.length+2); 
    graph.connect(pts.length, pts.length+2); 

    var outer = [pts.length, pts.length+1, pts.length+2]; 
    var outer_triangles = triangulate(graph, outer, polygon); 

    graph.triangulations.push(_.union(inner_triangles, outer_triangles)); 

    // create new DAG to hold triangle hierarchy
    var dag = new DAG(); 

    return {
        graph: graph,
        dag: dag
    }; 
};

// return next independent set in graph 
var findIndependentSet = function(graph) { 
    // look through all vertices (except last three) 
    var set = []; 
    var forbidden = []; 
    for (var i = 0; i < graph.vertices.length-3; i++) { 
        if (!graph.vertices[i].removed) {
            if (!_.contains(forbidden, i)) {
                if (graph.degree(i) <= 8) { 
                    set.push(i); 
                    _.each(graph.neighbors(i), function(n) { 
                        forbidden.push(n); 
                    }); 
                }   
            } 
        }
    }

    return set; 
}; 

// remove verts from graph, re-triangulate holes in graph, add old/new triangle links to DAG 
var removeVertices = function(graph, verts, dag) { 
    var triangles = _.map(_.last(graph.triangulations), function(t) { return t; }); // last triangulation
    
    _.each(verts, function(v) { 
        var res = graph.removeVertex(v); 

        // remove old triangles from previous triangulation
        triangles = _.reject(triangles, function(t) { return _.contains(res.old_triangles, t); }); 
        var new_triangles = triangulate(graph, res.polygon); 
        
        // add new triangles to triangulation 
        _.each(new_triangles, (t) => triangles.push(t)); 

        // compare old/new triangles to form links in DAG 
        _.each(res.old_triangles, function(o) { 
            _.each(new_triangles, function(n) { 
                if (util.trianglesIntersect(o, n, graph)) { 
                    dag.addDirectedEdge(n, o); 
                }
            }); 
        }); 
    }); 

    graph.triangulations.push(triangles); // save as next triangulation
}; 

module.exports = { 
    run: run,
    findIndependentSet: findIndependentSet,
    removeVertices: removeVertices,
    outer_triangle: outer_triangle
}; 


