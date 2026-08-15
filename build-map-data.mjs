import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { bridgeStraightGaps, closeOcclusions, connectedFrom, dilate, isRoadColor, nearestWalkable } from './navigation.js';

const CELL_SIZE = 8, TILE_SIZE = 4096, TILE_GRID = TILE_SIZE / CELL_SIZE, GRID_SIZE = TILE_GRID * 2;
const tiles = [['r1_c1', 0, 0], ['r1_c2', 1, 0], ['r2_c1', 0, 1], ['r2_c2', 1, 1]];
const places = [
  ['A','Suleman Dawood School of Business',2542,1430,'academic'], ['B','Mushtaq Ahmad Gurmani School of Humanities & Social Sciences (VC Office - Academic Block)',1876,2984,'academic'],
  ['C','Syed Babar Ali School of Science & Engineering',360,2930,'academic'], ['D','Sheikh Ahmad Hassan School of Law',2304,3780,'academic'], ['E','Syed Ahsan Ali & Syed Maratib Ali School of Education',2578,2984,'academic'],
  ['F','Rausing Executive Development Centre',1876,2164,'academic'], ['G','Gad & Birgit Rausing Library',2572,3390,'academic_service'], ['H','Executive Dining Centre',1160,2748,'service'],
  ['I','Mosque',2600,2164,'religious'], ['J','Male Hostels',450,1456,'residential'], ['K','Female Hostels',3158,3040,'residential'], ['L','Super Store / ATM',1160,3284,'academic_service'],
  ['M','Tennis Court',1422,1484,'sports'], ['N','Volleyball Court',1160,2164,'sports'], ['O','Sports Complex (Gyms)',1900,1456,'sports'], ['P','Cricket Ground',1448,424,'sports'],
  ['Q','Coca-Cola Aquatic Centre',1922,1010,'sports'], ['R','Vigilance Office',394,4018,'service'], ['S','Free Car Parking',484,678,'parking'], ['T','Visitor Parking',628,3738,'parking'],
  ['U','Football Ground',564,286,'sports'], ['W','VC House',3680,2548,'residential_service'], ['X','Daycare Centre',3840,2200,'service'], ['Y','In Gate',892,3960,'service'], ['Z','Out Gate',1866,3960,'service'],
].map(([letter,name,x,y,category]) => ({ id:`landmark_${letter}`, letter, name, category, reference_object_id:`place_${letter}`, centroid_global:[x*2,y*2], label_points_global:[[x*2,y*2]], quest_target:true, minimap_marker:true }));
const repeatedLabels={J:[[900,2912],[2164,2912],[968,4232]],K:[[6316,6080],[7224,7560],[6376,7668]],W:[[7360,5096],[7368,5752]]}; places.forEach((place)=>{if(repeatedLabels[place.letter])place.label_points_global=repeatedLabels[place.letter];});

const candidate = new Uint8Array(GRID_SIZE * GRID_SIZE);
for (const [id, column, row] of tiles) {
  const result = spawnSync('ffmpeg', ['-loglevel','error','-i',`assets/pixel_map/${id}.png`,'-vf','scale=1024:1024:flags=neighbor','-f','rawvideo','-pix_fmt','rgb24','pipe:1'], { maxBuffer: 1024 * 1024 * 8 });
  if (result.status) throw new Error(result.stderr.toString() || `Could not read ${id}.png`);
  const pixels = result.stdout;
  for (let y=0;y<TILE_GRID;y++) for (let x=0;x<TILE_GRID;x++) {
    let hits=0; for (let oy=0;oy<2;oy++) for (let ox=0;ox<2;ox++) { const pixel=((y*2+oy)*1024+x*2+ox)*3; if (isRoadColor(pixels[pixel],pixels[pixel+1],pixels[pixel+2])) hits++; }
    if (hits) candidate[(row*TILE_GRID+y)*GRID_SIZE+column*TILE_GRID+x]=1;
  }
}
const bridged = dilate(closeOcclusions(bridgeStraightGaps(candidate, GRID_SIZE, 18), GRID_SIZE, 10), GRID_SIZE, 1);
const spawnX=1784/CELL_SIZE, spawnY=7920/CELL_SIZE, start=nearestWalkable(bridged,GRID_SIZE,spawnX,spawnY), walkable=connectedFrom(bridged,GRID_SIZE,start);
const encode = (mask, width, x0=0, y0=0, size=width) => Array.from({length:size},(_,y)=>{const runs=[];let start=-1;for(let x=0;x<=size;x++){const on=x<size&&mask[(y+y0)*width+x+x0];if(on&&start<0)start=x;if(!on&&start>=0){runs.push([start,x-start]);start=-1;}}return runs;});
const entrances = places.map((item)=>({id:`entrance_${item.letter}`,building_id:item.reference_object_id,position_global:item.centroid_global,accessible:true}));
for (const [id,column,row] of tiles) {
  const localLandmarks=places.filter((item)=>item.label_points_global.some(([x,y])=>Math.floor(x/TILE_SIZE)===column&&Math.floor(y/TILE_SIZE)===row)).map((item)=>({...item,centroid_local:[item.centroid_global[0]-column*TILE_SIZE,item.centroid_global[1]-row*TILE_SIZE],label_points_local:item.label_points_global.filter(([x,y])=>Math.floor(x/TILE_SIZE)===column&&Math.floor(y/TILE_SIZE)===row).map(([x,y])=>[x-column*TILE_SIZE,y-row*TILE_SIZE])}));
  writeFileSync(`assets/pixel_map/${id}.json`,JSON.stringify({schema_version:'2.0',tile:{id,row:row+1,column:column+1,width_px:TILE_SIZE,height_px:TILE_SIZE,global_offset:[column*TILE_SIZE,row*TILE_SIZE]},landmarks:localLandmarks,building_entrances:entrances.filter(({building_id})=>localLandmarks.some(({reference_object_id})=>reference_object_id===building_id)),walkability:{cell_size_px:CELL_SIZE,width:TILE_GRID,height:TILE_GRID,rows:encode(walkable,GRID_SIZE,column*TILE_GRID,row*TILE_GRID,TILE_GRID)}},null,2)+'\n');
}
const master={schema_version:'2.0',map:{id:'lums_campus',name:'LUMS Campus',global_width_px:8192,global_height_px:8192,tile_width_px:TILE_SIZE,tile_height_px:TILE_SIZE},tiles:tiles.map(([id,column,row])=>({id,row:row+1,column:column+1,width_px:TILE_SIZE,height_px:TILE_SIZE,global_offset:[column*TILE_SIZE,row*TILE_SIZE]})),landmarks:places,building_entrances:entrances,walkability:{cell_size_px:CELL_SIZE,width:GRID_SIZE,height:GRID_SIZE,rows:encode(walkable,GRID_SIZE)},quality_control:{source:'clean pixel tiles + labelled_pixel_map references',coordinate_scale_from_reference:2,walkability_connected_from:'In Gate',generated:true}};
writeFileSync('assets/pixel_map/master.json',JSON.stringify(master,null,2)+'\n');
writeFileSync('assets/pixel_map/navigation.json',JSON.stringify({schema_version:'2.0',map_id:'lums_campus',routing:'A* over master.walkability',cell_size_px:CELL_SIZE,width:GRID_SIZE,height:GRID_SIZE},null,2)+'\n');
console.log(`Generated four tile annotations and ${walkable.reduce((sum,value)=>sum+value,0)} walkable cells.`);
