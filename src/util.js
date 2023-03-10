import { vec2,vec3 } from "gl-matrix";

function log() {
    console.log.apply(console, arguments);
}

function rrgb() {//rgb颜色随机
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return { r, g, b };
}

function aabb(points) {
    var start = { x: Infinity, y: Infinity };
    var end = { x: 0, y: 0 };

    for (var i = 0; i < points.length; i++) {
        var p = { x: points[i].__verticeWindowPosition[0], y: points[i].__verticeWindowPosition[1] };

        start.x = p.x < start.x ? p.x : start.x;
        start.y = p.y < start.y ? p.y : start.y;

        end.x = p.x > end.x ? p.x : end.x;
        end.y = p.y > end.y ? p.y : end.y;
    }

    return {
        x0: start.x,
        y0: start.y,
        x1: end.x,
        y1: end.y
    };
}

function substitute_point_in_line(p, pt1, pt2) {
    return ((p.y - pt1.__verticeWindowPosition[1]) * (pt2.__verticeWindowPosition[0] - pt1.__verticeWindowPosition[0])) - ((p.x - pt1.__verticeWindowPosition[0]) * (pt2.__verticeWindowPosition[1] - pt1.__verticeWindowPosition[1]));
}

//判定点在不在多边形里面，https://github.com/anirudhtopiwala/OpenSource_Problems/blob/master/Point_In_Polygon/src/point_in_polygon.cpp
function is_point_inside_convex_polygon(query_point, vertices) {
    const num_sides_of_polygon = vertices.length;
    let count_same_side_results = 0;
    // Iterate over each side.
    for (let i = 0; i < num_sides_of_polygon; ++i) {
        const point_in_line = substitute_point_in_line(query_point, vertices[i], vertices[(i + 1) % num_sides_of_polygon]);
        //console.log(point_in_line);throw "xx";

        // Check if the point lies on the polygon.
        if (point_in_line == 0) {
            return point_in_line;
        }

        count_same_side_results += point_in_line > 0;
    }
    return (Math.abs(count_same_side_results) == num_sides_of_polygon) ? 1 : -1;
}

//计算三角形面积
function getsArea(p1, p2, p3) {
    return 0.5 * ((p1[0] * p2[1] - p2[0] * p1[1]) + (p2[0] * p3[1] - p3[0] * p2[1]) + (p3[0] * p1[1] - p1[0] * p3[1]));
}

//求三角形内某点的重心坐标，插值用，用于zbuffer、着色
function barycentric(p, points) {
    const pLen = points.length;
    if (pLen != 3) {
        //log("barycentric invalid point count",points);
    }

    const a = vec2.fromValues(points[0].__verticeWindowPosition[0], points[0].__verticeWindowPosition[1]);
    const b = vec2.fromValues(points[1].__verticeWindowPosition[0], points[1].__verticeWindowPosition[1]);
    const c = vec2.fromValues(points[2].__verticeWindowPosition[0], points[2].__verticeWindowPosition[1]);

    const v0 = vec2.create();
    const v1 = vec2.create();
    const v2 = vec2.create();

    vec2.sub(v0, b, a);
    vec2.sub(v1, c, a);
    vec2.sub(v2, p, a);

    const d00 = vec2.dot(v0, v0);
    const d01 = vec2.dot(v0, v1);
    const d11 = vec2.dot(v1, v1);
    const d20 = vec2.dot(v2, v0);
    const d21 = vec2.dot(v2, v1);

    const denom = d00 * d11 - d01 * d01;

    const params = [];

    params[1] = ((d11 * d20 - d01 * d21) / denom);
    params[2] = (d00 * d21 - d01 * d20) / denom;
    params[0] = 1.0 - params[1] - params[2];

    return params;
}

//根据三角形重心坐标插值内部某个点的所有属性，如顶点颜色、z深度
function lerpFaceVertices(weights, vertices, scene, objIndex) {
    if (weights.length < vertices.length) {
        weights.push(0);//若点是4个点，参数只有3个，先补一个0，其实是不合法的
    }

    let color = { r: 0, g: 0, b: 0 };
    let zDepth = 0;
    let normal = null;
    let uvw = null;
    for (var i = 0; i < vertices.length; i++) {
        const v = vertices[i];

        //处理颜色
        if (!v['color']) {
            color = false; //没有颜色，则返回null
        } else {
            color['r'] += v['color']['r'] * weights[i];
            color['g'] += v['color']['g'] * weights[i];
            color['b'] += v['color']['b'] * weights[i];
        }

        //处理深度
        zDepth += v.__verticeWindowPosition[2] / v.__verticeWindowPosition[3] * weights[i];

        //顶点法线
        if (v.vertexNormalIndex) {
            const n = scene.models[objIndex].vertexNormals[v.__vni];
            
            if(!normal){
                normal = { x: 0, y: 0, z: 0 };
            }

            normal.x += n.x * weights[i];
            normal.y += n.y * weights[i];
            normal.z += n.z * weights[i];
        }

        //处理纹理坐标
        if (v.textureCoordsIndex) {
            if(!uvw){
                uvw = { u: 0, v: 0 };
            }
            const uv = scene.models[objIndex].textureCoords[v.__vui];
            uvw.u += uv.u * weights[i];
            uvw.v += uv.v * weights[i];
        }
    }

    return { color, zDepth, normal, uvw };
}

//计算三角形法线
function getNormal(p1,p2,p3){
    const l1 = vec3.create();vec3.sub(l1,p2,p1);
    const l2 = vec3.create();vec3.sub(l2,p3,p1);

    const normal = vec3.create();
    vec3.cross(normal,l1,l2);
    vec3.normalize(normal,normal);
    
    return normal;
}

export { log, rrgb, aabb, is_point_inside_convex_polygon, barycentric, lerpFaceVertices,getNormal };
