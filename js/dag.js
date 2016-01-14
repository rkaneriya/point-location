/* 
    Directed acyclic graph (for storing triangle hierachy)
*/ 

var _ = require('underscore'); 

var DAG = function() {
    this.adj = {}; // maps to t_ids to adjacency lists  
}; 

DAG.prototype.addDirectedEdge = function(n1, n2) {
    if (this.adj[n1] == undefined) this.adj[n1] = [n2];
    else this.adj[n1].push(n2); 
};

// or "neighbors"
DAG.prototype.children = function(n) {
    return this.adj[n]; 
}; 

DAG.prototype.root = function() { 
    return _.last(_.keys(this.adj)); 
}; 

module.exports = DAG; 