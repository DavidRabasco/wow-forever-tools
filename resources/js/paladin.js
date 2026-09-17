let state = {}; // {slug: puntos_actuales}
let allTalents = [];
fetch('/api/paladin')
.then(response => response.json())
.then(data => {
    const tree = data.trees[0]; // solo Holy de momento
const div = document.getElementById('trees');
div.innerHTML = `<h2>${tree.name}</h2>`;

const grid = document.createElement('div');
grid.className = 'grid grid-cols-4 gap-2 max-w-md';
grid.style.gridTemplateRows = 'repeat(7, 64px)';
div.appendChild(grid);

// 7x4 = 28 celdas
for(let r=1; r<=7; r++){
  for(let c=1; c<=4; c++){
    const t = tree.talents.find(x => x.row===r && x.col===c);
    const cell = document.createElement('div');
    cell.className = 'rounded border flex items-center justify-center text-xs h-16 ' + 
      (t ? 'bg-amber-800 border-amber-500 cursor-pointer' : 'bg-neutral-800 border-neutral-700 opacity-40');
    cell.style.gridRow = r;
    cell.style.gridColumn = c;
    cell.textContent = t ? `${t.name} 0/${t.max_rank}` : '';
    if(t) cell.title = `${t.description} [${t.status}]`;
    grid.appendChild(cell);
  }
}
});