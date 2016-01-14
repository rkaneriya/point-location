/* 
    Utility functions for testing point containment and side/triangle intersections 
*/ 

var _ = require('underscore'); 

var ccw = function(a, b, c) { 
    return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y); 
};

var triangleContainsPoint = function(p, tri) { 
    var p1 = tri[0]; 
    var p2 = tri[1]; 
    var p3 = tri[2]; 

    return ((ccw(p1, p2, p) > 0) && (ccw(p2, p3, p) > 0) && (ccw(p3, p1, p) > 0)); 
}; 

var sidesIntersect = function(a, b, c, d) { 
    var int1 = (ccw(a, b, c) > 0) ? (ccw(a, b, d) < 0) : (ccw(a, b, d) > 0);
    var int2 = (ccw(c, d, a) > 0) ? (ccw(c, d, b) < 0) : (ccw(c, d, b) > 0); 

    return int1 && int2;  
}; 

var trianglesIntersect = function(t_id1, t_id2, graph) { 
    var t1 = graph.all_triangles[t_id1]; 
    var t2 = graph.all_triangles[t_id2]; 

    var tri1 = [t1.v1, t1.v2, t1.v3]; 
    var tri2 = [t2.v1, t2.v2, t2.v3];

    var tri1_pts = _.map(tri1, function(t) { return graph.vertices[t].point; }); 
    var tri2_pts = _.map(tri2, function(t) { return graph.vertices[t].point; }); 

    for (var i = 0; i < 3; i++) { 
        for (var j = 0; j < 3; j++) { 
            var a = graph.vertices[tri1[i]].point; 
            var b = graph.vertices[tri1[(i == 2) ? 0 : i+1]].point; 
            var c = graph.vertices[tri2[j]].point; 
            var d = graph.vertices[tri2[(j == 2) ? 0 : j+1]].point; 

            if (sidesIntersect(a, b, c, d)) return true; 

            if (triangleContainsPoint(tri1_pts[i], tri2_pts, graph) 
                || triangleContainsPoint(tri2_pts[j], tri1_pts, graph))
                return true; 
        }
    }

    return false; 
}; 

module.exports = { 
    ccw: ccw,
    triangleContainsPoint: triangleContainsPoint,
    sidesIntersect: sidesIntersect,
    trianglesIntersect: trianglesIntersect
}; 