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
//  6. Visual estilo WoW: celda = solo icono + rango superpuesto (sin rectangulos).
//     Borde verde fino = disponible, amarillo = al maximo, gris = bloqueado
//     (icono en escala de grises + apagado). Se repinta en cada click.
//  7. Flechas de dependencia estilo WoW: SVG superpuesto al grid con una linea
//     del requisito al dependiente (illumination<-reverence, etc.). Gris si el
//     requisito no esta al maximo, dorada cuando se cumple. Se redibuja en resize.
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

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-4 gap-2 max-w-md relative'; // relative: el SVG de flechas se posiciona sobre el grid
    grid.style.gridTemplateRows = 'repeat(7, 64px)';
    div.appendChild(grid);

    // Contador de puntos DE LA RAMA, debajo del grid (sustituye al viejo
    // #counter-holy estatico de la plantilla, que siempre mostraba 0).
    const counter = document.createElement('div');
    counter.id = 'counter';
    counter.className = 'text-sm text-neutral-300 mt-2';
    counter.textContent = `0 puntos`;
    div.appendChild(counter);

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

    // Actualizar el contador de puntos de la rama ("12 puntos", verde al completar 51)
    function updateCounter(){
        const total = pointsInTree(tree);
        counter.textContent = `${total} puntos`;
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

    // Flechas de dependencia estilo WoW (SVG superpuesto, sin librerias).
    // ------------------------------------------------------------------
    // Cada talento con requires_talent_id lleva una flecha de su requisito a el:
    // illumination<-reverence y lights-vigil<-holy-shock (verticales),
    // divine-precision<-holy-shock (horizontal). La linea va de borde a borde
    // de icono por el pasillo entre celdas; si atraviesa una casilla vacia
    // (fila 6 entre holy-shock y light's-vigil) es normal, como en el juego.
    // Gris = requisito sin maxear, dorada = requisito cumplido.
    const arrows = []; // {line, parent} para repintar colores sin volver a medir
    let arrowSvg = null; // capa SVG sobre el grid (pointer-events-none: no roba clicks)

    // Pinta el color de las flechas segun el estado. Separado del trazado para
    // poder llamarlo en cada click sin medir el DOM otra vez.
    function paintArrows(){
        for(const arrow of arrows){
            const done = state[arrow.parent.slug] >= arrow.parent.max_rank;
            arrow.line.setAttribute('stroke', done ? '#ffd100' : '#6b7280');
            arrow.line.setAttribute('marker-end', done ? 'url(#arrow-gold)' : 'url(#arrow-gray)');
        }
    }

    // Extremos de la flecha: centros alineados al eje dominante, del borde del
    // icono padre al borde del icono hijo (o de la celda si el <img> fallo).
    // Todo en px relativos al grid, que es el sistema de coordenadas del SVG.
    function arrowEndpoints(fromCell, toCell){
        const fromBox = fromCell.querySelector('img') || fromCell;
        const toBox = toCell.querySelector('img') || toCell;
        const gridRect = grid.getBoundingClientRect();
        const fr = fromBox.getBoundingClientRect();
        const tr = toBox.getBoundingClientRect();
        const fx = fr.left + fr.width / 2 - gridRect.left;
        const fy = fr.top + fr.height / 2 - gridRect.top;
        const tx = tr.left + tr.width / 2 - gridRect.left;
        const ty = tr.top + tr.height / 2 - gridRect.top;
        // Eje dominante: las conexiones del arbol son rectas (misma fila o columna).
        if(Math.abs(ty - fy) >= Math.abs(tx - fx)){
            const x = (fx + tx) / 2;
            return ty > fy
                ? { x1: x, y1: fr.bottom - gridRect.top, x2: x, y2: tr.top - gridRect.top }
                : { x1: x, y1: fr.top - gridRect.top, x2: x, y2: tr.bottom - gridRect.top };
        }
        const y = (fy + ty) / 2;
        return tx > fx
            ? { x1: fr.right - gridRect.left, y1: y, x2: tr.left - gridRect.left, y2: y }
            : { x1: fr.left - gridRect.left, y1: y, x2: tr.right - gridRect.left, y2: y };
    }

    // Crea la capa SVG y traza una linea por dependencia. Se llama al inicio y
    // en cada resize (las coordenadas dependen del ancho real del grid).
    function drawArrows(){
        // Limpia el trazado anterior (en resize se vuelve a medir todo).
        arrows.length = 0;
        if(arrowSvg) arrowSvg.remove();
        const NS = 'http://www.w3.org/2000/svg';
        arrowSvg = document.createElementNS(NS, 'svg');
        arrowSvg.setAttribute('class', 'absolute inset-0 pointer-events-none');
        arrowSvg.setAttribute('width', grid.clientWidth);
        arrowSvg.setAttribute('height', grid.clientHeight);
        // Puntas de flecha: una gris y una dorada (tamano fijo, no escalan).
        const defs = document.createElementNS(NS, 'defs');
        const heads = [['arrow-gray', '#6b7280'], ['arrow-gold', '#ffd100']];
        for(const head of heads){
            const marker = document.createElementNS(NS, 'marker');
            marker.setAttribute('id', head[0]);
            marker.setAttribute('markerWidth', '7');
            marker.setAttribute('markerHeight', '7');
            marker.setAttribute('refX', '5.5');
            marker.setAttribute('refY', '3.5');
            marker.setAttribute('orient', 'auto');
            marker.setAttribute('markerUnits', 'userSpaceOnUse');
            const tip = document.createElementNS(NS, 'path');
            tip.setAttribute('d', 'M0,0 L7,3.5 L0,7 z');
            tip.setAttribute('fill', head[1]);
            marker.appendChild(tip);
            defs.appendChild(marker);
        }
        arrowSvg.appendChild(defs);
        // Detras de los iconos: se inserta primero para no taparlos.
        grid.insertBefore(arrowSvg, grid.firstChild);
        // Una linea por talento con requisito, del padre al hijo.
        for(const talent of tree.talents){
            if(!talent.requires_talent_id) continue; // sin requisito = sin flecha
            const parent = tree.talents.find(item => item.id === talent.requires_talent_id);
            const fromCell = parent && cells[parent.slug];
            const toCell = cells[talent.slug];
            if(!parent || !fromCell || !toCell) continue; // seguridad: dato roto, sin flecha
            const p = arrowEndpoints(fromCell, toCell);
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', p.x1);
            line.setAttribute('y1', p.y1);
            line.setAttribute('x2', p.x2);
            line.setAttribute('y2', p.y2);
            line.setAttribute('stroke-width', '2');
            arrowSvg.appendChild(line);
            arrows.push({ line, parent });
        }
        paintArrows();
    }

    // Pinta cada talento segun su estado, como en el WoW original:
    //  - al maximo (state == max_rank): borde AMARILLO, icono a todo color.
    //  - disponible (canSpend): borde VERDE fino, icono a todo color, cursor de click.
    //  - bloqueado (falta puerta de fila, falta prerequisito o tope 51): borde GRIS,
    //    icono en escala de grises + apagado, cursor bloqueado.
    // El color va en el borde del <img> (la celda ya no tiene caja). Se llama al
    // inicio y despues de cada click, porque gastar/quitar puntos en un talento
    // puede bloquear o desbloquear a los demas (puertas de fila).
    function updateVisuals(){
        for(const talent of tree.talents){
            const cell = cells[talent.slug];
            if(!cell) continue; // seguridad: si falta la celda, no romper el resto
            const icon = cell.querySelector('img');
            const label = cell.querySelector('span');
            const maxed = state[talent.slug] >= talent.max_rank;
            const available = canSpend(talent, tree);
            const blocked = !maxed && !available;
            // Borde del icono: amarillo = maximo, verde = disponible, gris = bloqueado.
            if(icon) icon.style.borderColor = maxed ? '#ffd100' : (available ? '#22ff22' : '#6b7280');
            cell.style.cursor = available ? 'pointer' : (maxed ? 'default' : 'not-allowed');
            // Icono gris + apagado solo si bloqueado; a todo color si disponible o al maximo.
            if(icon) icon.style.filter = blocked ? 'grayscale(100%)' : '';
            if(icon) icon.style.opacity = blocked ? '0.35' : '';
            // Rango atenuado si bloqueado y aun sin puntos (si ya tiene puntos
            // pero el tope 51 lo bloquea, se queda legible para poder quitarle).
            if(label) label.style.opacity = (blocked && state[talent.slug] === 0) ? '0.6' : '';
        }
        // Las flechas tambien cambian (gris -> dorada) al maxear requisitos.
        paintArrows();
    }

    // Tooltip estilo Wowhead (sigue al raton; una sola capa para toda la pagina).
    // ------------------------------------------------------------------
    // Colores Wowhead: nombre en blanco, descripcion en amarillo (#ffd100),
    // requisitos sin cumplir en rojo, y al final en verde la accion disponible:
    // "Click para aprender" (si aun admite puntos) o "Click derecho para
    // olvidar" (si esta al maximo). pointer-events:none para que no parpadee
    // al pasar el raton por encima del propio tooltip.
    const tooltip = document.createElement('div');
    tooltip.id = 'talent-tooltip';
    tooltip.style.cssText = 'position:fixed;display:none;z-index:50;max-width:320px;pointer-events:none;'
        + 'background:rgba(8,8,16,0.95);border:1px solid #a0a0a0;border-radius:4px;'
        + 'padding:8px 10px;font-size:12px;line-height:1.4;';
    document.body.appendChild(tooltip);
    let tooltipSlug = null; // talento mostrado ahora (para refrescarlo tras cada click)

    // Puntos de rama que pide la fila (0 en fila 1, 5 en fila 2... 30 en fila 7).
    function rowRequirement(talent){ return (talent.row - 1) * 5; }

    // HTML del tooltip segun el estado actual (se regenera en cada hover y click).
    function tooltipHtml(talent){
        const pts = state[talent.slug] || 0;
        // Nombre en blanco + rango actual.
        let html = `<div style="color:#fff;font-weight:bold;font-size:14px">${talent.name}</div>`;
        html += `<div style="color:#fff">Rank ${pts}/${talent.max_rank}</div>`;
        // Descripcion en amarillo (en DB es un resumen de todos los rangos).
        if(talent.description) html += `<div style="color:#ffd100;margin-top:4px">${talent.description}</div>`;
        // Requisitos en rojo: puerta de fila y talento previo sin maxear.
        const missing = [];
        const needPts = rowRequirement(talent);
        if(pointsInTree(tree) < needPts) missing.push(`Requires ${needPts} points in Holy Talents`);
        if(talent.requires_talent_id){
            const parent = tree.talents.find(item => item.id === talent.requires_talent_id);
            if(parent && (state[parent.slug] || 0) < parent.max_rank)
                missing.push(`Requires ${parent.max_rank} point${parent.max_rank > 1 ? 's' : ''} in ${parent.name}`);
        }
        for(const line of missing) html += `<div style="color:#ff4040;margin-top:4px">${line}</div>`;
        // Si se cumplen, accion en verde: aprender (admite puntos) u olvidar (al maximo).
        if(missing.length === 0){
            if(pts < talent.max_rank && totalPoints() < MAX_TOTAL_POINTS)
                html += `<div style="color:#40ff40;margin-top:4px">Click para aprender</div>`;
            else if(pts > 0)
                html += `<div style="color:#40ff40;margin-top:4px">Click derecho para olvidar</div>`;
        }
        return html;
    }

    // Coloca el tooltip junto al cursor sin salirse de la ventana (gira al otro
    // lado si no cabe a la derecha o abajo).
    function placeTooltip(event){
        const pad = 16;
        tooltip.style.display = 'block';
        const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
        let x = event.clientX + pad, y = event.clientY + pad;
        if(x + w > window.innerWidth - 8) x = event.clientX - w - pad;
        if(y + h > window.innerHeight - 8) y = event.clientY - h - pad;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    function showTooltip(event, talent){
        tooltipSlug = talent.slug;
        tooltip.innerHTML = tooltipHtml(talent);
        placeTooltip(event);
    }

    function hideTooltip(){
        tooltipSlug = null;
        tooltip.style.display = 'none';
    }

    // Tras gastar/quitar con el tooltip abierto, refresca su texto (rango y colores).
    function refreshTooltip(talent, event){
        if(tooltipSlug !== talent.slug) return;
        tooltip.innerHTML = tooltipHtml(talent);
        if(event) placeTooltip(event);
    }

    // 7x4 = 28 celdas (algunas vacias: Holy real tiene 17 talentos)
    for(let r=1; r<=7; r++){
    for(let c=1; c<=4; c++){

        const talent = tree.talents.find(item => item.row===r && item.col===c);
        const cell = document.createElement('div');
        cell.style.gridRow = r;
        cell.style.gridColumn = c;
        // Casilla vacia: en WoW no hay caja, solo el fondo. Se deja el hueco
        // del grid transparente para no pintar rectangulos fantasma.
        if(!talent){
            cell.className = 'h-16';
        } else {
            // Casilla estilo WoW: UNICAMENTE el icono (44px) centrado + rango "0/5"
            // superpuesto abajo-derecha. Sin nombre, sin fondo, sin rectangulo.
            cell.className = 'relative flex items-center justify-center h-16';
            const iconImage = document.createElement('img');
            iconImage.alt = talent.name;
            // Borde de 2px cuyo color pone updateVisuals(): verde = disponible,
            // amarillo = al maximo, gris = bloqueado.
            iconImage.className = 'w-11 h-11 rounded border-2';
            iconImage.style.borderStyle = 'solid';
            const iconSrc = iconUrl(talent, 'medium');
            if(iconSrc){
                iconImage.src = iconSrc;
                // Si el icono falla (URL muerta), se quita y queda el rango como placeholder.
                iconImage.onerror = () => iconImage.remove();
            }
            cell.appendChild(iconImage);
            // Rango superpuesto como en el juego: esquina inferior derecha DEL ICONO
            // (contenedor relativo), sombra negra para legibilidad, sin interceptar
            // clicks (pointer-events-none). El <div> evita confundirlo con el <span>.
            const iconWrap = document.createElement('div');
            iconWrap.className = 'relative leading-none';
            iconImage.replaceWith(iconWrap);
            iconWrap.appendChild(iconImage);
            const label = document.createElement('span');
            label.className = 'absolute bottom-0 right-0 text-[11px] leading-none text-white pointer-events-none';
            label.style.textShadow = '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000';
            label.textContent = `0/${talent.max_rank}`;
            iconWrap.appendChild(label);
        }
        // (Sin title nativo: lo sustituye el tooltip personalizado estilo Wowhead de abajo.)


        //Clicks en los talentos: actualizan state y solo el <span> del rango (sin borrar el <img>).
        if(talent){
        const refreshLabel = () => {
            const label = cell.querySelector('span');
            if (label) label.textContent = `${state[talent.slug]}/${talent.max_rank}`;
        };
        cell.onclick = (event) => { // Click izquierdo para gastar puntos
            if(canSpend(talent, tree)){ state[talent.slug]++; refreshLabel();
            updateCounter(); updateVisuals(); refreshTooltip(talent, event);} // repinta: puede desbloquear filas o llegar al tope 51
        };
        cell.oncontextmenu = (event) => { // Click derecho para quitar puntos
            event.preventDefault();
            if(canRemove(talent, tree)){ state[talent.slug]--; refreshLabel();
            updateCounter(); updateVisuals(); refreshTooltip(talent, event); } // repinta: puede volver a bloquear filas superiores
        };
        // Hover estilo Wowhead: muestra el tooltip al entrar, lo mueve con el
        // raton y lo oculta al salir. Solo en celdas con talento.
        cell.addEventListener('mouseenter', (event) => showTooltip(event, talent));
        cell.addEventListener('mousemove', placeTooltip);
        cell.addEventListener('mouseleave', hideTooltip);
        }
        if(talent) cells[talent.slug] = cell; // Guarda la celda para repintar su estado en updateVisuals()
        grid.appendChild(cell);
    }
    }
    // Estado inicial: con 0 puntos solo la fila 1 esta disponible; el resto sale en gris.
    updateVisuals();
    // Dibuja las flechas de dependencia (necesita las celdas ya creadas para medir).
    drawArrows();
    // Al cambiar el ancho (responsive) las coordenadas cambian: redibujar.
    window.addEventListener('resize', drawArrows);
})
// Captura cualquier fallo (red, API 500, JSON sin trees) y lo muestra en pantalla.
// Sin este catch el error seria "Cannot read properties of undefined (reading '0')"
.catch(error => {
    const div = document.getElementById('trees');
    if(div) div.innerHTML = `<p class="text-red-400">Error cargando talentos: ${error.message}</p>`;
    console.error('[paladin] fallo cargando /api/paladin:', error);
});
