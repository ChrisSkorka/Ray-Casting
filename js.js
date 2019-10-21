var current_texture = null;
var is_drawing = false;
var is_moving = false;
var controls = {
	forward: 0,
	sideways: 0,
	rotation: 0,
}
var update_interval;

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
	x: map_size/2,
	y: map_size/2,
	r: 0,
}
var FOV = 60 * Math.PI / 180;

function init(){

	current_texture = document.getElementById('default_texture');
	map = [...Array(map_size).keys()].map(y => [...Array(map_size).keys()].map(x => (0 < x && x < map_size-1 && 0 < y && y < map_size-1) ? null : current_texture));
	
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

	update_interval = setInterval(update, 20);
}

function update(){

	player.r += controls.rotation / 20;
	var dx = controls.sideways*Math.sin(-player.r) + controls.forward*Math.cos(player.r);
	var dy = controls.forward*Math.sin(player.r) + controls.sideways*Math.cos(player.r);

	player.x += dx / 20;
	player.y += dy / 20;

	render();
}

function setTexture(texture){
	current_texture = texture;
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
			map[y][x] = current_texture;

		render();
	}

	if(is_moving){
		
		player.x = x;
		player.y = y;

		render();
	}

}

function onOutputKeyDown(event){
	
	switch(event.key){
		case "ArrowLeft":
			controls.rotation = 1;
			break;
		case "ArrowRight":
			controls.rotation = -1;
			break;
		case "w":
			controls.forward = 1;
			break;
		case "s":
			controls.forward = -1;
			break;
		case "a":
			controls.sideways = 1;
			break;
		case "d":
			controls.sideways = -1;
			break;
	}
}

function onOutputKeyUp(event){
	
	switch(event.key){
		case "ArrowLeft":
		case "ArrowRight":
			controls.rotation = 0;
			break;
		case "w":
		case "s":
			controls.forward = 0;
			break;
		case "a":
		case "d":
			controls.sideways = 0;
			break;
	}
}

function onOutputWheel(event){
	player.r += event.deltaY / 1000;
}

function render(){
	
	renderInput();
	renderOutput();
}

function renderInput(){

	for(var y=0; y<map_size; y++){
		for(var x=0; x<map_size; x++){
			var block = map[y][x];

			if(block == null){
				input_context.fillStyle = '#FFFFFF';
				input_context.fillRect(x*block_size, y*block_size, block_size, block_size);
			}else{
				input_context.drawImage(block, x*block_size, y*block_size, block_size, block_size);
			}
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

	var ray_cast_hits = [];

	for(var col=0; col<output_canvas.width; col++, r-=dr){

		var dx = Math.cos(r);
		var dy = Math.sin(r);

		var c = '#FF0000';

		var hit = {ix: ix, iy: iy, fx: fx, fy: fy, x:null, y:null};

		while(map[hit.iy][hit.ix] == null){

			exit_point = getBlockExitPoint(hit.fx, hit.fy, dx, dy);

			hit.ix += exit_point.dx;
			hit.iy += exit_point.dy;
			hit.fx = exit_point.x;
			hit.fy = exit_point.y;

		}

		hit.x = hit.ix + hit.fx;
		hit.y = hit.iy + hit.fy;
		wall_x = (hit.fy == 0 || hit.fy == 1) ? hit.fx : hit.fy;

		texture = map[hit.iy][hit.ix];
		d = Math.sqrt(Math.pow((hit.x - x), 2) + Math.pow((hit.y - y), 2));


		ray_cast_hits.push([hit.x, hit.y]);

		var height = output_canvas.height / d;
		var top = (output_canvas.height - height) / 2;
		var bottom = top + height;

		output_context.fillStyle = '#88BBFF';
		output_context.fillRect(col,0,1,top);

		output_context.drawImage(texture, wall_x*600, 0, 1, 600, col,top,1,height);

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