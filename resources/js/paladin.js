fetch('/api/paladin')
.then(response => response.json())
.then(data => {
    let state = {}; // Guarda los puntos invertidos en cada talento (2/5, 0/3, etc.)
    const tree = data.trees[0]; // solo Holy de momento
    tree.talents.forEach(talent => state[talent.slug] = 0); // Inicializa el estado con 0 puntos en cada talento
    const div = document.getElementById('trees'); 
    div.innerHTML = `<h2>${tree.name}</h2>`;
    const counter = document.createElement('div');
    counter.id = 'counter';
    counter.className = 'text-sm text-neutral-300 mb-2';
    counter.textContent = '0 puntos';
    div.appendChild(counter);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-4 gap-2 max-w-md';
    grid.style.gridTemplateRows = 'repeat(7, 64px)';
    div.appendChild(grid);

    // Devuelve la cantidad de puntos invertidos en un árbol de talentos
        function pointsInTree(tree){
            return tree.talents.reduce((s, talent) => s + state[talent.slug], 0);
        }

        //Actualizar el contador de puntos
        function updateCounter(){
            const total = pointsInTree(tree);
            counter.textContent = `${total} puntos`;
        }

        //Reglas de talentos
        function canSpend(talent, tree){
            // Si el talento ya está al máximo, no se puede gastar más
            if(state[talent.slug] >= talent.max_rank) return false;

            // Si el talento requiere un talento previo, verifica que esté al máximo
            if(talent.requires_talent_id){
                const req = tree.talents.find(x => x.id === talent.requires_talent_id);
                if(!req || state[req.slug] < req.max_rank) return false;
            }

            // Si el talento requiere un mínimo de puntos en el árbol, verifica que se cumpla
            if(pointsInTree(tree) < (talent.row-1)*5) return false; // Cada fila requiere 5 puntos por fila anterior
            return true;
        }
    // 7x4 = 28 celdas
    for(let r=1; r<=7; r++){
    for(let c=1; c<=4; c++){
        
        const talent = tree.talents.find(x => x.row===r && x.col===c);
        const cell = document.createElement('div');
        cell.className = 'rounded border flex items-center justify-center text-xs h-16 ' + 
        (talent ? 'bg-amber-800 border-amber-500 cursor-pointer' : 'bg-neutral-800 border-neutral-700 opacity-40');
        cell.style.gridRow = r;
        cell.style.gridColumn = c;
        cell.textContent = talent ? `${talent.name} 0/${talent.max_rank}` : ''; // Muestra el nombre del talento y los puntos invertidos
        if(talent) cell.title = `${talent.description} [${talent.status}]`; // Muestra la descripción del talento al pasar el mouse
        

        //Clicks en los talentos
        if(talent){
        cell.onclick = () => { //
            if(canSpend(talent, tree)){ state[talent.slug]++; cell.textContent = `${talent.name} ${state[talent.slug]}/${talent.max_rank}`;
            updateCounter();}
        };
        cell.oncontextmenu = (e) => { // Click derecho para quitar puntos
            e.preventDefault();
            if(state[talent.slug] > 0){ state[talent.slug]--; cell.textContent = `${talent.name} ${state[talent.slug]}/${talent.max_rank}`; 
            updateCounter(); }
        };
        }
        grid.appendChild(cell); 
    }
    }
});
