// Calculadora Holy Paladin - WoW Forever (nivel 60 = 51 puntos).
// ---------------------------------------------------------------------------
// Fuente de datos: GET /api/paladin -> { trees: [holy, ...], cada tree.talents[] }.
// Cada talento trae de DB: id, slug, name, row (1-7), col (1-4), max_rank,
// requires_talent_id (FK o null), is_gold, status, description, icon (nombre corto o null).
//
// Reglas classic/Forever implementadas:
//  1. Tope por talento: state[slug] <= max_rank.
//  2. Puerta por fila: para fila R hacen falta (R-1)*5 puntos en el arbol.
//     Ej: fila 2 pide 5, fila 7 pide 30.
//  3. Prerequisito: si requires_talent_id, el requerido debe estar al maximo.
//  4. Tope global 51: un nivel 60 solo tiene 51 puntos entre TODOS los arboles.
//     De momento solo se pinta Holy, asi que el tope se aplica a Holy;
//     cuando haya multi-arbol, totalPoints = suma de los 3 arboles.
//  5. Quitar puntos (click derecho): no se puede si rompe la puerta de fila de
//     otro talento con puntos, ni si un dependiente sigue con puntos.
//  6. Visual estilo WoW: al maximo = borde dorado; disponible = color normal;
//     bloqueado (sin puerta de fila, sin prerequisito o tope 51) = gris
//     (icono en escala de grises + apagado). Se repinta en cada click.
//
// Controles: click izquierdo suma, click derecho resta (con menu bloqueado).
// Iconos (c) Blizzard, uso educativo: en DB solo 'spell_holy_x', aqui se monta
// la URL de wow.zamimg.com. Si no hay icono o falla, queda solo texto.
fetch('/api/paladin')
// Si la API falla (500, 404, red caida), response.ok es false: mostramos el error
// en #trees en vez de romper con "Cannot read properties of undefined".
.then(response => {
    if(!response.ok) throw new Error(`API /api/paladin devolvio ${response.status}`);
    return response.json();
})
.then(data => {
    // La API debe devolver { trees: [...] }. Si viene un error JSON o HTML parseado,
    // data.trees no existe: avisamos en pantalla en vez de fallar en data.trees[0].
    if(!data || !Array.isArray(data.trees) || data.trees.length === 0){
        throw new Error('API sin datos: data.trees vacio. Revisa storage/logs/laravel.log');
    }
    // Nivel 60 en Classic/Forever = 51 puntos de talento (1 por nivel desde el 10).
    const MAX_TOTAL_POINTS = 51;

    let state = {}; // Guarda los puntos invertidos en cada talento (2/5, 0/3, etc.)
    const tree = data.trees[0]; // solo Holy de momento (trees[0] por order=1)
    tree.talents.forEach(talent => state[talent.slug] = 0); // Inicializa el estado con 0 puntos en cada talento
    const div = document.getElementById('trees');
    div.innerHTML = `<h2>${tree.name}</h2>`;
    const counter = document.createElement('div');
    counter.id = 'counter';
    counter.className = 'text-sm text-neutral-300 mb-2';
    counter.textContent = `0 / ${MAX_TOTAL_POINTS} puntos`;
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

    // Devuelve la cantidad de puntos invertidos en un arbol de talentos
    function pointsInTree(tree){
        // Recorre todos los talentos del arbol y suma state[slug] de cada uno.
        // acumulado = total hasta ahora, talent = talento actual. Empezamos en 0.
        return tree.talents.reduce((acumulado, talent) => acumulado + (state[talent.slug] || 0), 0);
    }

    // Total global (multi-arbol cuando exista; hoy = solo Holy).
    function totalPoints(){
        // data.trees puede traer holy+protection+retribution; state solo tiene slugs cargados.
        // Los talentos de arboles no pintados aportan 0 porque state[slug] es undefined -> 0.
        return data.trees.reduce((acumulado, t) =>
            acumulado + t.talents.reduce((s, talent) => s + (state[talent.slug] || 0), 0), 0);
    }

    // Actualizar el contador de puntos ("12 / 51 puntos", verde al completar)
    function updateCounter(){
        const total = pointsInTree(tree);
        counter.textContent = `${total} / ${MAX_TOTAL_POINTS} puntos`;
        counter.style.color = total >= MAX_TOTAL_POINTS ? '#22c55e' : '';
    }

    // Reglas para GASTAR un punto (click izquierdo)
    function canSpend(talent, tree){
        // Si el talento ya esta al maximo, no se puede gastar mas
        if(state[talent.slug] >= talent.max_rank) return false;

        // Tope global 51: no deja pasar del maximo de nivel 60
        if(totalPoints() >= MAX_TOTAL_POINTS) return false;

        // Si el talento requiere un talento previo, verifica que este al maximo
        if(talent.requires_talent_id){
            const requiredTalent = tree.talents.find(item => item.id === talent.requires_talent_id);
            if(!requiredTalent || state[requiredTalent.slug] < requiredTalent.max_rank) return false;
        }

        // Si el talento requiere un minimo de puntos en el arbol, verifica que se cumpla
        if(pointsInTree(tree) < (talent.row-1)*5) return false; // Cada fila requiere 5 puntos por fila anterior
        return true;
    }

    // Reglas para QUITAR un punto (click derecho).
    // Simula quitar 1 punto y comprueba que ningun talento con puntos quede ilegal:
    // ni por puerta de fila ni por prerequisito roto.
    function canRemove(talent, tree){
        // Sin puntos no hay nada que quitar
        if(state[talent.slug] <= 0) return false;
        // Estado simulado con 1 punto menos en este talento
        const sim = { ...state, [talent.slug]: state[talent.slug] - 1 };
        const pointsIn = (tr) => tr.talents.reduce((a, t) => a + (sim[t.slug] || 0), 0);
        // Cada talento con puntos debe seguir cumpliendo puerta de fila y prerequisito
        for(const t of tree.talents){
            if((sim[t.slug] || 0) <= 0) continue; // sin puntos no bloquea
            if(pointsIn(tree) < (t.row-1)*5) return false; // puerta de fila rota
            if(t.requires_talent_id){
                const req = tree.talents.find(item => item.id === t.requires_talent_id);
                if(!req || (sim[req.slug] || 0) < req.max_rank) return false; // prerequisito roto
            }
        }
        return true;
    }

    // Mapa slug -> celda DOM, para repintar estados sin reconstruir el grid.
    const cells = {};

    // Pinta cada talento segun su estado, como en el WoW original:
    //  - al maximo (state == max_rank): borde dorado, icono a todo color.
    //  - disponible (canSpend): icono a todo color, cursor de click.
    //  - bloqueado (falta puerta de fila, falta prerequisito o tope 51): gris,
    //    icono en escala de grises + apagado, texto atenuado, cursor bloqueado.
    // Se llama al inicio y despues de cada click, porque gastar/quitar puntos
    // en un talento puede bloquear o desbloquear a los demas (puertas de fila).
    function updateVisuals(){
        for(const talent of tree.talents){
            const cell = cells[talent.slug];
            if(!cell) continue; // seguridad: si falta la celda, no romper el resto
            const icon = cell.querySelector('img');
            const label = cell.querySelector('span');
            const maxed = state[talent.slug] >= talent.max_rank;
            const available = canSpend(talent, tree);
            const blocked = !maxed && !available;
            // Borde dorado al completar (los is_gold llevan outline propio por tipo; no se toca).
            cell.style.borderColor = maxed ? '#facc15' : '';
            cell.style.cursor = available ? 'pointer' : (maxed ? 'default' : 'not-allowed');
            // Icono gris + apagado solo si bloqueado; a todo color si disponible o al maximo.
            if(icon) icon.style.filter = blocked ? 'grayscale(100%)' : '';
            if(icon) icon.style.opacity = blocked ? '0.35' : '';
            // Celda y texto atenuados si bloqueado y aun sin puntos (si ya tiene puntos
            // pero el tope 51 lo bloquea, se queda legible para poder quitarle).
            const dimmed = blocked && state[talent.slug] === 0;
            cell.style.opacity = dimmed ? '0.55' : '';
            if(label) label.style.opacity = dimmed ? '0.6' : '';
        }
    }

    // 7x4 = 28 celdas (algunas vacias: Holy real tiene 17 talentos)
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
            // Dorado: resalta borde si is_gold (talentos 21/31 pts como Holy Shock / Light's Vigil)
            if(talent.is_gold) cell.style.outline = '2px solid gold';
        } else {
            cell.textContent = '';
        }
        if(talent) cell.title = `${talent.description} [${talent.status}]`; // Muestra la descripcion del talento al pasar el mouse


        //Clicks en los talentos: actualizan state y solo el <span> del texto (sin borrar el <img>).
        if(talent){
        const refreshLabel = () => {
            const label = cell.querySelector('span');
            if (label) label.textContent = `${talent.name} ${state[talent.slug]}/${talent.max_rank}`;
        };
        cell.onclick = () => { // Click izquierdo para gastar puntos
            if(canSpend(talent, tree)){ state[talent.slug]++; refreshLabel();
            updateCounter(); updateVisuals();} // repinta: puede desbloquear filas o llegar al tope 51
        };
        cell.oncontextmenu = (event) => { // Click derecho para quitar puntos
            event.preventDefault();
            if(canRemove(talent, tree)){ state[talent.slug]--; refreshLabel();
            updateCounter(); updateVisuals(); } // repinta: puede volver a bloquear filas superiores
        };
        }
        if(talent) cells[talent.slug] = cell; // Guarda la celda para repintar su estado en updateVisuals()
        grid.appendChild(cell);
    }
    }
    // Estado inicial: con 0 puntos solo la fila 1 esta disponible; el resto sale en gris.
    updateVisuals();
})
// Captura cualquier fallo (red, API 500, JSON sin trees) y lo muestra en pantalla.
// Sin este catch el error seria "Cannot read properties of undefined (reading '0')"
.catch(error => {
    const div = document.getElementById('trees');
    if(div) div.innerHTML = `<p class="text-red-400">Error cargando talentos: ${error.message}</p>`;
    console.error('[paladin] fallo cargando /api/paladin:', error);
});
