# Kirkpatrick's Point Location
An interactive implementation of Kirkpatrick's point location algorithm for COS 451 (Computational Geometry). 

Play with it [here](http://rkaneriya.github.io/point-location), or [watch a demo](https://youtu.be/xQZackH69BQ). Read the original paper by Kirkpatrick [here](https://www.cs.princeton.edu/courses/archive/fall05/cos528/handouts/Optimal%20Search%20In%20Planar.pdf).

--- 

## Instructions

1) Click within the bounding triangle to create a simple polygon. Select "Close Polygon" when finished. 

2) Select "Triangulate" to triangulate the polygon as well as the region outside the polygon but inside the bounding triangle. 

3) Select "Find Independent Set" to highlight a set of vertices in the resulting graph. 

4) Select "Remove Set & Re-Triangulate" to remove the highlighted points and re-triangulate the "holes" left by their removal. 

5) Repeat steps 2 & 3 until the coarsest triangulation (the bounding triangle) is reached. 

6) Select a "query point" inside one of the faces of the base triangulation. 

7) Repeatedly select "Step" to view each level of triangulation with the triangle containing the query point highlighted in yellow. 

## Implementation

O(n) space complexity and O(n^2) time complexity for pre-processing the planar graph. O(log n) for point location queries. 

I used the following module for triangulation: https://github.com/mapbox/earcut (uses the ear-clipping algorithm for O(n^2) triangulation).   
