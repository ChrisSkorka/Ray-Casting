var current_color = null;
var is_drawing = false;
var is_moving = false;

var map_size = 20;
var block_size;
var map = [];

var input_canvas;
var output_canvas;

var input_context;
var output_context;

var input_rect;
var output_rect;

var player = {
	x: map_size/4+0.5,
	y: map_size/4+0.5,
	r: 0,
}
var FOV = 60 * Math.PI / 180;

function init(){

	map = [...Array(map_size).keys()].map(y => [...Array(map_size).keys()].map(x => (0 < x && x < map_size-1 && 0 < y && y < map_size-1) ? null : '#888888'));
	
	input_canvas = document.getElementById('input');
	output_canvas = document.getElementById('output');

	input_context = input_canvas.getContext('2d');
	output_context = output_canvas.getContext('2d');
	// input_context.globalCompositeOperation = 'destination-out';

	block_size = input_canvas.width / map_size;
	input_context.transform(1,0,0,-1,0,input_canvas.width)
	// input_context.transform(block_size,0,0,-block_size,0,input_canvas.width)

	input_rect = input_canvas.getBoundingClientRect();
	output_rect = output_canvas.getBoundingClientRect();
	

	render();
}

function set_color(color){
	current_color = color;
}

function onInputMouseDown(event){
	event.preventDefault();
	is_drawing = event.button == 0;
	is_moving = event.button == 2;
	onInputMouseMove(event);
}

function onInputMouseUp(event){
	event.preventDefault();
	is_drawing = false;
	is_moving = false;
}

function onInputMouseMove(event){

	var x = (event.clientX - input_rect.left) / block_size;
	var y = map_size - (event.clientY - input_rect.top) / block_size;

	if(is_drawing){

		x = Math.floor(x);
		y = Math.floor(y);

		if(0 < x && x < map_size-1 && 0 < y && y < map_size-1)
			map[y][x] = current_color;

		render();
	}

	if(is_moving){
		
		player.x = x;
		player.y = y;

		render();
	}

}

function render(){
	
	renderInput();
	renderOutput();
}

function renderInput(){

	for(var y=0; y<map_size; y++){
		for(var x=0; x<map_size; x++){
			var block = map[y][x];

			input_context.fillStyle = block == null ? '#FFFFFF' : block;
			input_context.fillRect(x*block_size, y*block_size, block_size, block_size);
		}
	}
}

function renderOutput(){

	var x = player.x;
	var y = player.y;
	var ix = Math.floor(x);
	var iy = Math.floor(y);
	var fx = x - ix;
	var fy = y - iy;

	var dr = FOV / output_canvas.width;
	var r = player.r + FOV/2;

	for(var col=0; col<output_canvas.width; col++, r-=dr){

		var dx = Math.cos(r);
		var dy = Math.sin(r);

		var c = '#FF0000';

		var hit = {ix: ix, iy: iy, fx: fx, fy: fy, x:null, y:null};

		while(map[hit.iy][hit.ix] == null){

			// console.log(hit);
			// console.log({dx:dx, dy:dy});
			exit_point = getBlockExitPoint(hit.fx, hit.fy, dx, dy);
			// console.log(exit_point);

			// input_context.strokeStyle = '#FF0000';
			// input_context.beginPath();
			// input_context.moveTo(x*block_size, y*block_size);
			// input_context.lineTo(hit.x*block_size, hit.y*block_size);
			// input_context.stroke();

			hit.ix += exit_point.dx;
			hit.iy += exit_point.dy;
			hit.fx = exit_point.x;
			hit.fy = exit_point.y;

		}

		hit.x = hit.ix + hit.fx;
		hit.y = hit.iy + hit.fy;

		color = map[hit.iy][hit.ix];
		d = Math.sqrt(Math.pow((hit.x - x), 2) + Math.pow((hit.y - y), 2));

		if(c != null){
			// console.log({x:x, y:y, hx:hit.x, hy:hit.y, dx:dx, dy:dy});
			
			input_context.strokeStyle = '#555555';
			input_context.beginPath();
			input_context.moveTo(x*block_size, y*block_size);
			input_context.lineTo(hit.x*block_size, hit.y*block_size);
			input_context.stroke();
			
			input_context.strokeStyle = '#222222';
			input_context.beginPath();
			input_context.moveTo(x*block_size, y*block_size);
			input_context.lineTo((x+dx)*block_size, (y+dy)*block_size);
			input_context.stroke();
			// input_context.fillRect(x*block_size+block_size/4, y*block_size+block_size/4, block_size/2, block_size/2);
		}

		var height = output_canvas.height / d;
		var top = (output_canvas.height - height) / 2;
		var bottom = top + height;

		output_context.fillStyle = '#88BBFF'
		output_context.fillRect(col,0,1,top);

		output_context.fillStyle = color
		output_context.fillRect(col,top,1,bottom);

		output_context.fillStyle = '#555555'
		output_context.fillRect(col,bottom,1,output_canvas.height);

	}

}

function getBlockExitPoint(x, y, dx, dy){
	
	var top    = x + (1 - y) / (dy/dx);
	var bottom = x - y / (dy/dx);
	var left   = y - x / (dx/dy);
	var right  = y + (1 - x) / (dx/dy);

	if(dy > 0 && 0 <= top && top <= 1)
		return {dx: +0, dy: +1, x: top, y: +0};
	
	if(dy < 0 && 0 <= bottom && bottom <= 1)
		return {dx: +0, dy: -1, x: bottom, y: +1};
	
	if(dx < 0 && 0 <= left && left <= 1)
		return {dx: -1, dy: +0, x: +1, y: left};
	
	if(dx > 0 && 0 <= right && right <= 1)
		return {dx: +1, dy: +0, x: +0, y: right};

	if(top == 0 && left == 0)
		return {dx: -1, dy: +1, x: +1, y: +0};

	if(top == 1 && right == 0)
		return {dx: +1, dy: +1, x: +0, y: +0};

	if(bottom == 0 && left == 1)
		return {dx: -1, dy: -1, x: +1, y: +1};
		
	if(bottom == 1 && right == 1)
		return {dx: +1, dy: -1, x: +0, y: +1};

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