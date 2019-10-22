// <img> reference
var current_texture = null;

// editor state for mouse move events
var is_drawing = false;
var is_erasing = false;
var is_moving = false;

// for periodic updates
var update_interval;
var uptodate = false;

// define map
var map_size = 20;
var block_size;
var map = [];

// define canvases for 2D and 3D map rendering
var input_canvas;
var output_canvas;

var input_context;
var output_context;

var input_rect;
var output_rect;

// camera positoin
var camera = {
	x: map_size/2+0.5,
	y: map_size/2+0.5,
	r: 0,

	dx: 0,
	dy: 0,
	dr: 0,
}
var FOV = 60 * Math.PI / 180;

// initialise canvases and begin rendering
function init(){

	// 'load' initial texture and set border of map to it
	current_texture = document.getElementById('default_texture');
	map = [...Array(map_size).keys()].map(y => [...Array(map_size).keys()].map(x => (0 < x && x < map_size-1 && 0 < y && y < map_size-1) ? null : current_texture));
	
	// input: 2D map, output: 3D rendering
	input_canvas = document.getElementById('input');
	output_canvas = document.getElementById('output');

	input_context = input_canvas.getContext('2d');
	output_context = output_canvas.getContext('2d');

	// set coordinate system of input to origin at bottom left
	block_size = input_canvas.width / map_size;
	input_context.transform(1,0,0,-1,0,input_canvas.width)
	// input_context.transform(block_size,0,0,-block_size,0,input_canvas.width)

	input_rect = input_canvas.getBoundingClientRect();
	output_rect = output_canvas.getBoundingClientRect();

	// begin update interval
	update_interval = setInterval(update, 20);
}

// update the camera state and refresh the rendereing if changes occured
function update(){

	// if not stationary, uptodate is false
	uptodate &= camera.dr == 0 && camera.dy == 0 && camera.dx == 0;

	if(uptodate)
		return;

	// update the camera state according to the camera
	camera.r += camera.dr / 20;

	// canculated global x, y changes from cameras relatives movements
	var dx = camera.dx*Math.sin(-camera.r) + camera.dy*Math.cos(camera.r);
	var dy = camera.dy*Math.sin(camera.r) + camera.dx*Math.cos(camera.r);
	camera.x += dx / 20;
	camera.y += dy / 20;

	// render graphcis
	render();
	uptodate = true;
}

// set the current texture for the 2D map editing
function setTexture(texture){
	current_texture = texture;
}

// on input (2D map) mouse down enable drawing
function onInputMouseDown(event){
	event.preventDefault();
	is_drawing = event.button == 0;
	is_erasing = event.button == 2;
	onInputMouseMove(event);
}

// on input (2D map) mouse up disable drawing
function onInputMouseUp(event){
	event.preventDefault();
	is_drawing = false;
	is_erasing = false;
	is_moving = false;
}

// on input (2D map) mouse move (and down) find map entry and update it
function onInputMouseMove(event){

	// calculate position on map
	var x = (event.clientX - input_rect.left) / block_size;
	var y = map_size - (event.clientY - input_rect.top) / block_size;

	if(is_drawing || is_erasing){

		// int coordinates
		x = Math.floor(x);
		y = Math.floor(y);

		// update map entry
		if(0 < x && x < map_size-1 && 0 < y && y < map_size-1)
			map[y][x] = is_drawing ? current_texture : null;

		uptodate = false;
	}

	// for moving the camera around
	if(is_moving){
		
		camera.x = x;
		camera.y = y;

		uptodate = false;
	}

}

// on key down, update camera object to move camera
function onOutputKeyDown(event){
	
	switch(event.key){
		case "ArrowLeft":
			camera.dr = 1;
			break;
		case "ArrowRight":
			camera.dr = -1;
			break;
		case "w":
			camera.dy = 1;
			break;
		case "s":
			camera.dy = -1;
			break;
		case "a":
			camera.dx = 1;
			break;
		case "d":
			camera.dx = -1;
			break;
	}
}

// on key up, update camera object to move camera
function onOutputKeyUp(event){
	
	switch(event.key){
		case "ArrowLeft":
		case "ArrowRight":
			camera.dr = 0;
			break;
		case "w":
		case "s":
			camera.dy = 0;
			break;
		case "a":
		case "d":
			camera.dx = 0;
			break;
	}
}

// on scroll wheen, instantaneously rotate camera
function onOutputWheel(event){
	// camera.r += event.deltaY / 1000;
	// uptodate = false;
}

// call input and output renderer
function render(){
	
	renderInput();
	renderOutput();
}

// render input (2D map) canvas
function renderInput(){

	// for each x,y entry of map
	for(var y=0; y<map_size; y++){
		for(var x=0; x<map_size; x++){
			var block = map[y][x];

			// draw white if empty else draw texture
			if(block == null){
				input_context.fillStyle = '#FFFFFF';
				input_context.fillRect(x*block_size, y*block_size, block_size, block_size);
			}else{
				input_context.drawImage(block, x*block_size, y*block_size, block_size, block_size);
			}
		}
	}
}

// render output (3D) canvas
function renderOutput(){

	// camera coordinate as integer and fractal component
	var x = camera.x;
	var y = camera.y;
	var ix = Math.floor(x);
	var iy = Math.floor(y);
	var fx = x - ix;
	var fy = y - iy;

	// rotation start and seps
	var dr = FOV / output_canvas.width;
	var r = camera.r + FOV/2;

	// ray end points for view preview in input
	var ray_cast_hits = [];

	// for each column in the picture, cast a ray through the 2D map
	for(var col=0; col<output_canvas.width; col++, r-=dr){

		// x and y derivatives
		var dx = Math.cos(r);
		var dy = Math.sin(r);

		// hold the final ray hit point
		var hit = {ix: ix, iy: iy, fx: fx, fy: fy, x:null, y:null};

		// whilst not wall found, follow ray path
		while(map[hit.iy][hit.ix] == null){

			exit_point = getBlockExitPoint(hit.fx, hit.fy, dx, dy);

			hit.ix += exit_point.dx;
			hit.iy += exit_point.dy;
			hit.fx = exit_point.x;
			hit.fy = exit_point.y;

		}

		// compute actual hit point in map and on wall
		hit.x = hit.ix + hit.fx;
		hit.y = hit.iy + hit.fy;
		wall_x = (hit.fy == 0 || hit.fy == 1) ? hit.fx : hit.fy;

		// texture to use
		texture = map[hit.iy][hit.ix];
		texture_width = texture.naturalWidth;
		texture_height = texture.naturalHeight;

		// distance to hit point
		d = Math.sqrt(Math.pow((hit.x - x), 2) + Math.pow((hit.y - y), 2));

		// save hit point for view preview in 2D map
		ray_cast_hits.push([hit.x, hit.y]);

		// calculate heights of sky, block and floor of this column
		var height = output_canvas.height / d;
		var top = (output_canvas.height - height) / 2;
		var bottom = top + height;

		// draw sky
		output_context.fillStyle = '#88BBFF';
		output_context.fillRect(col,0,1,top);

		// draw block
		output_context.drawImage(texture, wall_x*texture_width, 0, 1, texture_height, col,top,1,height);

		// draw floor
		output_context.fillStyle = '#555555';
		output_context.fillRect(col,bottom,1,output_canvas.height);

	}

	input_context.strokeStyle = '#000000';
	input_context.fillStyle = '#AAAAAA';
	input_context.beginPath();
	input_context.moveTo(x*block_size, y*block_size);
	
	ray_cast_hits.forEach(hit => {
		input_context.lineTo(hit[0]*block_size, hit[1]*block_size);
	});
	input_context.closePath();

	input_context.fill();
	input_context.stroke();
	
}

// compute ray exit point through a block
// Params:
// 		x: within block x coordinate (0.0 - 1.0)
// 		y: within block y coordinate (0.0 - 1.0)
// 		dx: derivative with respect to x
// 		dy: derivative with respect to y
function getBlockExitPoint(x, y, dx, dy){
	
	// intersection points with the 4 walls
	var top    = x + (1 - y) / (dy/dx);
	var bottom = x - y / (dy/dx);
	var left   = y - x / (dx/dy);
	var right  = y + (1 - x) / (dx/dy);

	// top
	if(dy > 0 && 0 <= top && top <= 1)
		return {dx: +0, dy: +1, x: top, y: +0};
	
	// bottom
	if(dy < 0 && 0 <= bottom && bottom <= 1)
		return {dx: +0, dy: -1, x: bottom, y: +1};
	
	// left
	if(dx < 0 && 0 <= left && left <= 1)
		return {dx: -1, dy: +0, x: +1, y: left};
	
	// right
	if(dx > 0 && 0 <= right && right <= 1)
		return {dx: +1, dy: +0, x: +0, y: right};

	// top left
	if(top == 0 && left == 0)
		return {dx: -1, dy: +1, x: +1, y: +0};

	// top right
	if(top == 1 && right == 0)
		return {dx: +1, dy: +1, x: +0, y: +0};

	// bottom left
	if(bottom == 0 && left == 1)
		return {dx: -1, dy: -1, x: +1, y: +1};
		
	// bottom right
	if(bottom == 1 && right == 1)
		return {dx: +1, dy: -1, x: +0, y: +1};

	// if all fail, debug output
	console.log({
		x:x, 
		y:y, 
		dx:dx, 
		dy:dy,
		dydx:dy/dx, 
		dxdy:dx/dy,
		top:top, 
		bottom:bottom, 
		left:left, 
		right:right,
	});
}