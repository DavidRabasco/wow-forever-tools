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

    // Construye la URL del icono desde wow.zamimg.com a partir del nombre corto guardado en DB.
    // En DB guardamos solo 'spell_holy_sealofsalvation', no la URL entera ni el binario.
    // Iconos (c) Blizzard, uso educativo. Si no existe (nuevo en Forever), el onerror pone placeholder.
    function iconUrl(talent, size = 'medium') {
        if (!talent.icon) return null;
        return `https://wow.zamimg.com/images/wow/icons/${size}/${talent.icon}.jpg`;
    }

    // Devuelve la cantidad de puntos invertidos en un árbol de talentos
        function pointsInTree(tree){
            // Recorre todos los talentos del árbol y suma state[slug] de cada uno.
            // acumulado = total hasta ahora, talent = talento actual. Empezamos en 0.
            return tree.talents.reduce((acumulado, talent) => acumulado + (state[talent.slug] || 0), 0);
        }

        //Actualizar el contador de puntos
        function updateCounter(){
            const total = pointsInTree(tree);
            counter.textContent = `${total} puntos`;
            counter.style.color = total >= 16 ? '#22c55e' : '';
        }

        //Reglas de talentos
        function canSpend(talent, tree){
            // Si el talento ya está al máximo, no se puede gastar más
            if(state[talent.slug] >= talent.max_rank) return false;

            // Si el talento requiere un talento previo, verifica que esté al máximo
            if(talent.requires_talent_id){
                const requiredTalent = tree.talents.find(item => item.id === talent.requires_talent_id);
                if(!requiredTalent || state[requiredTalent.slug] < requiredTalent.max_rank) return false;
            }

            // Si el talento requiere un mínimo de puntos en el árbol, verifica que se cumpla
            if(pointsInTree(tree) < (talent.row-1)*5) return false; // Cada fila requiere 5 puntos por fila anterior
            return true;
        }
    // 7x4 = 28 celdas
    for(let r=1; r<=7; r++){
    for(let c=1; c<=4; c++){
        
        const talent = tree.talents.find(item => item.row===r && item.col===c);
        const cell = document.createElement('div');
        cell.className = 'rounded border flex items-center justify-center text-xs h-16 ' + 
        (talent ? 'bg-amber-800 border-amber-500 cursor-pointer' : 'bg-neutral-800 border-neutral-700 opacity-40');
        cell.style.gridRow = r;
        cell.style.gridColumn = c;
        // Si hay icono (nombre corto en DB), pinta imagen de wow.zamimg + texto de puntos.
        // Si no hay icono o falla la carga, deja solo el texto (placeholder).
        if (talent) {
            const iconSrc = iconUrl(talent, 'medium');
            if (iconSrc) {
                const iconImage = document.createElement('img');
                iconImage.src = iconSrc;
                iconImage.alt = talent.name;
                iconImage.className = 'w-8 h-8 rounded mr-1';
                iconImage.onerror = () => iconImage.remove();
                cell.appendChild(iconImage);
            }
            const label = document.createElement('span');
            label.textContent = `${talent.name} 0/${talent.max_rank}`;
            cell.appendChild(label);
        } else {
            cell.textContent = '';
        }
        if(talent) cell.title = `${talent.description} [${talent.status}]`; // Muestra la descripción del talento al pasar el mouse
        

        //Clicks en los talentos: actualizan state y solo el <span> del texto (sin borrar el <img>).
        if(talent){
        const refreshLabel = () => {
            const label = cell.querySelector('span');
            if (label) label.textContent = `${talent.name} ${state[talent.slug]}/${talent.max_rank}`;
        };
        cell.onclick = () => { // Click izquierdo para gastar puntos
            if(canSpend(talent, tree)){ state[talent.slug]++; refreshLabel();
            updateCounter();}
        };
        cell.oncontextmenu = (event) => { // Click derecho para quitar puntos
            event.preventDefault();
            if(state[talent.slug] > 0){ state[talent.slug]--; refreshLabel();
            updateCounter(); }
        };
        }
        grid.appendChild(cell); 
    }
    }
});
