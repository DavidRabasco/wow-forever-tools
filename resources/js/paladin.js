// Holy Paladin calculator - WoW Forever (level 60 = 51 points).
// ---------------------------------------------------------------------------
// Data source: GET /api/paladin -> { trees: [holy, ...], each tree.talents[] }.
// Each talent comes from the DB with: id, slug, name, row (1-7), col (1-4),
// max_rank, requires_talent_id (FK or null), is_gold, status, description,
// icon (short name or null).
//
// Implemented classic/Forever rules:
//  1. Per-talent cap: state[slug] <= max_rank.
//  2. Row gate: row R needs (R-1)*5 points spent in the tree.
//     E.g. row 2 needs 5, row 7 needs 30.
//  3. Prerequisite: if requires_talent_id, the required talent must be maxed.
//  4. Global 51 cap: a level 60 only has 51 talent points across ALL trees.
//     Only Holy is rendered for now, so the cap applies to Holy;
//     with multi-tree, totalPoints = sum of the 3 trees.
//  5. Removing points (right click): not allowed if it would break the row gate
//     of another skilled talent, or leave a dependent without its prerequisite.
//  6. WoW-style visuals: cell = icon only + overlaid rank (no rectangles).
//     Thin green border = available, yellow = maxed, gray = locked
//     (grayscaled + dimmed icon). Repainted on every click.
//  7. WoW-style dependency arrows: SVG overlay with one line from the
//     requirement to the dependent (illumination<-reverence, etc.). Gray while
//     the requirement is not maxed, gold once fulfilled. Redrawn on resize.
//
// Controls: left click spends, right click removes (context menu blocked).
// Icons (c) Blizzard, educational use: the DB stores only 'spell_holy_x', the
// wow.zamimg.com URL is built here. Missing/broken icons fall back to text.
fetch('/api/paladin')
// If the API fails (500, 404, network down), response.ok is false: show the
// error in #trees instead of crashing with "Cannot read properties of undefined".
.then(response => {
    if(!response.ok) throw new Error(`API /api/paladin returned ${response.status}`);
    return response.json();
})
.then(data => {
    // The API must return { trees: [...] }. On an error JSON or parsed HTML,
    // data.trees does not exist: warn on screen instead of failing at data.trees[0].
    if(!data || !Array.isArray(data.trees) || data.trees.length === 0){
        throw new Error('API returned no data: data.trees is empty. Check storage/logs/laravel.log');
    }
    // Level 60 in Classic/Forever = 51 talent points (1 per level from 10).
    const MAX_TOTAL_POINTS = 51;

    let state = {}; // Points spent per talent (2/5, 0/3, etc.)
    const tree = data.trees[0]; // Holy only for now (trees[0] by order=1)
    tree.talents.forEach(talent => state[talent.slug] = 0); // Start every talent at 0 points
    const div = document.getElementById('trees');
    div.innerHTML = `<h2>${tree.name}</h2>`;

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-4 gap-2 max-w-md relative'; // relative: the arrow SVG positions over the grid
    grid.style.gridTemplateRows = 'repeat(7, 64px)';
    div.appendChild(grid);

    // Branch point counter, below the grid.
    const counter = document.createElement('div');
    counter.id = 'counter';
    counter.className = 'text-sm text-neutral-300 mt-2';
    counter.textContent = `0 points`;
    div.appendChild(counter);

    // Build the icon URL from wow.zamimg.com using the short name stored in the DB.
    // The DB stores only 'spell_holy_sealofsalvation', never the full URL or binary.
    // Icons (c) Blizzard, educational use. Missing ones (new in Forever) fall back
    // to placeholder via onerror.
    function iconUrl(talent, size = 'medium') {
        if (!talent.icon) return null;
        return `https://wow.zamimg.com/images/wow/icons/${size}/${talent.icon}.jpg`;
    }

    // Points spent in one talent tree.
    function pointsInTree(tree){
        // Sum state[slug] over the tree.
        // acumulado = running total, talent = current talent. Starts at 0.
        return tree.talents.reduce((acumulado, talent) => acumulado + (state[talent.slug] || 0), 0);
    }

    // Global total (multi-tree ready; today = Holy only).
    function totalPoints(){
        // data.trees may hold holy+protection+retribution; unpainted trees
        // contribute 0 because state[slug] is undefined -> 0.
        return data.trees.reduce((acumulado, t) =>
            acumulado + t.talents.reduce((s, talent) => s + (state[talent.slug] || 0), 0), 0);
    }

    // Refresh the branch counter ("12 points", green when 51 is reached).
    function updateCounter(){
        const total = pointsInTree(tree);
        counter.textContent = `${total} points`;
        counter.style.color = total >= MAX_TOTAL_POINTS ? '#22c55e' : '';
    }

    // Rules for SPENDING a point (left click).
    function canSpend(talent, tree){
        // Already maxed, nothing more to spend.
        if(state[talent.slug] >= talent.max_rank) return false;

        // Global 51 cap: never exceed the level 60 maximum.
        if(totalPoints() >= MAX_TOTAL_POINTS) return false;

        // Prerequisite talent must be maxed first.
        if(talent.requires_talent_id){
            const requiredTalent = tree.talents.find(item => item.id === talent.requires_talent_id);
            if(!requiredTalent || state[requiredTalent.slug] < requiredTalent.max_rank) return false;
        }

        // Row gate: each row needs 5 points per previous row.
        if(pointsInTree(tree) < (talent.row-1)*5) return false;
        return true;
    }

    // Rules for REMOVING a point (right click).
    // Simulates removing 1 point and checks that no skilled talent is left illegal:
    // neither by row gate nor by broken prerequisite.
    function canRemove(talent, tree){
        // Nothing to remove.
        if(state[talent.slug] <= 0) return false;
        // Simulated state with 1 point less on this talent.
        const sim = { ...state, [talent.slug]: state[talent.slug] - 1 };
        const pointsIn = (tr) => tr.talents.reduce((a, t) => a + (sim[t.slug] || 0), 0);
        // Every skilled talent must still meet its row gate and prerequisite.
        for(const t of tree.talents){
            if((sim[t.slug] || 0) <= 0) continue; // unskilled talents don't block
            if(pointsIn(tree) < (t.row-1)*5) return false; // broken row gate
            if(t.requires_talent_id){
                const req = tree.talents.find(item => item.id === t.requires_talent_id);
                if(!req || (sim[req.slug] || 0) < req.max_rank) return false; // broken prerequisite
            }
        }
        return true;
    }

    // slug -> cell DOM map, to repaint states without rebuilding the grid.
    const cells = {};

    // WoW-style dependency arrows (overlaid SVG, no libraries).
    // ------------------------------------------------------------------
    // Each talent with requires_talent_id gets an arrow from its requirement:
    // illumination<-reverence and lights-vigil<-holy-shock (vertical),
    // divine-precision<-holy-shock (horizontal). The line runs edge to edge
    // between icons through the cell corridor; crossing an empty slot
    // (row 6 between holy-shock and light's-vigil) is normal, as in game.
    // Gray = requirement not maxed, gold = requirement fulfilled.
    const arrows = []; // {line, parent} to recolor without re-measuring
    let arrowSvg = null; // SVG layer over the grid (pointer-events-none: never steals clicks)

    // Paint arrow colors from state. Split from tracing so every click can
    // call it without measuring the DOM again.
    function paintArrows(){
        for(const arrow of arrows){
            const done = state[arrow.parent.slug] >= arrow.parent.max_rank;
            arrow.line.setAttribute('stroke', done ? '#ffd100' : '#6b7280');
            arrow.line.setAttribute('marker-end', done ? 'url(#arrow-gold)' : 'url(#arrow-gray)');
        }
    }

    // Arrow endpoints: centers snapped to the dominant axis, from the parent
    // icon edge to the child icon edge (or the cell if the <img> failed).
    // All in px relative to the grid, which is the SVG coordinate system.
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
        // Dominant axis: tree links are straight (same row or column).
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

    // Build the SVG layer and trace one line per dependency. Called on load and
    // on every resize (coordinates depend on the real grid width).
    function drawArrows(){
        // Clear the previous tracing (resize re-measures everything).
        arrows.length = 0;
        if(arrowSvg) arrowSvg.remove();
        const NS = 'http://www.w3.org/2000/svg';
        arrowSvg = document.createElementNS(NS, 'svg');
        arrowSvg.setAttribute('class', 'absolute inset-0 pointer-events-none');
        arrowSvg.setAttribute('width', grid.clientWidth);
        arrowSvg.setAttribute('height', grid.clientHeight);
        // Arrowheads: one gray, one gold (fixed size, never scale).
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
        // Behind the icons: inserted first so it never covers them.
        grid.insertBefore(arrowSvg, grid.firstChild);
        // One line per required talent, from parent to child.
        for(const talent of tree.talents){
            if(!talent.requires_talent_id) continue; // no requirement = no arrow
            const parent = tree.talents.find(item => item.id === talent.requires_talent_id);
            const fromCell = parent && cells[parent.slug];
            const toCell = cells[talent.slug];
            if(!parent || !fromCell || !toCell) continue; // safety: broken data, no arrow
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

    // Paint each talent by state, as in original WoW:
    //  - maxed (state == max_rank): YELLOW border, full-color icon.
    //  - available (canSpend): thin GREEN border, full-color icon, click cursor.
    //  - locked (missing row gate, missing prerequisite, or 51 cap): GRAY border,
    //    grayscaled + dimmed icon, blocked cursor.
    // Color goes on the <img> border (cells have no box anymore). Called on load
    // and after every click, because spending/removing on one talent can lock
    // or unlock the others (row gates).
    function updateVisuals(){
        for(const talent of tree.talents){
            const cell = cells[talent.slug];
            if(!cell) continue; // safety: missing cell must not break the rest
            const icon = cell.querySelector('img');
            const label = cell.querySelector('span');
            const maxed = state[talent.slug] >= talent.max_rank;
            const available = canSpend(talent, tree);
            const blocked = !maxed && !available;
            // Icon border: yellow = maxed, green = available, gray = locked.
            if(icon) icon.style.borderColor = maxed ? '#ffd100' : (available ? '#22ff22' : '#6b7280');
            cell.style.cursor = available ? 'pointer' : (maxed ? 'default' : 'not-allowed');
            // Gray + dimmed icon only when locked; full color when available or maxed.
            if(icon) icon.style.filter = blocked ? 'grayscale(100%)' : '';
            if(icon) icon.style.opacity = blocked ? '0.35' : '';
            // Dimmed rank when locked and still unskilled (skilled but 51-capped
            // talents stay readable so points can still be removed).
            if(label) label.style.opacity = (blocked && state[talent.slug] === 0) ? '0.6' : '';
        }
        // Arrows change too (gray -> gold) when requirements get maxed.
        paintArrows();
    }

    // Wowhead-style tooltip (follows the mouse; one layer for the whole page).
    // ------------------------------------------------------------------
    // Wowhead colors: white name, yellow (#ffd100) description, red unmet
    // requirements, and a final green line with the available action:
    // "Click to learn" (still takes points) or "Right-click to unlearn"
    // (already maxed). pointer-events:none so hovering the tooltip itself
    // never makes it flicker.
    const tooltip = document.createElement('div');
    tooltip.id = 'talent-tooltip';
    tooltip.style.cssText = 'position:fixed;display:none;z-index:50;max-width:320px;pointer-events:none;'
        + 'background:rgba(8,8,16,0.95);border:1px solid #a0a0a0;border-radius:4px;'
        + 'padding:8px 10px;font-size:12px;line-height:1.4;';
    document.body.appendChild(tooltip);
    let tooltipSlug = null; // talent currently shown (refreshed after each click)

    // Branch points required by a row (0 on row 1, 5 on row 2... 30 on row 7).
    function rowRequirement(talent){ return (talent.row - 1) * 5; }

    // Tooltip HTML from current state (rebuilt on every hover and click).
    function tooltipHtml(talent){
        const pts = state[talent.slug] || 0;
        // White name + current rank.
        let html = `<div style="color:#fff;font-weight:bold;font-size:14px">${talent.name}</div>`;
        html += `<div style="color:#fff">Rank ${pts}/${talent.max_rank}</div>`;
        // Yellow description (the DB holds a summary of all ranks).
        if(talent.description) html += `<div style="color:#ffd100;margin-top:4px">${talent.description}</div>`;
        // Red requirements: row gate and unmaxed parent talent.
        const missing = [];
        const needPts = rowRequirement(talent);
        if(pointsInTree(tree) < needPts) missing.push(`Requires ${needPts} points in Holy Talents`);
        if(talent.requires_talent_id){
            const parent = tree.talents.find(item => item.id === talent.requires_talent_id);
            if(parent && (state[parent.slug] || 0) < parent.max_rank)
                missing.push(`Requires ${parent.max_rank} point${parent.max_rank > 1 ? 's' : ''} in ${parent.name}`);
        }
        for(const line of missing) html += `<div style="color:#ff4040;margin-top:4px">${line}</div>`;
        // When everything is met, green action: learn (takes points) or unlearn (maxed).
        if(missing.length === 0){
            if(pts < talent.max_rank && totalPoints() < MAX_TOTAL_POINTS)
                html += `<div style="color:#40ff40;margin-top:4px">Click to learn</div>`;
            else if(pts > 0)
                html += `<div style="color:#40ff40;margin-top:4px">Right-click to unlearn</div>`;
        }
        return html;
    }

    // Place the tooltip next to the cursor without leaving the viewport (flips
    // to the other side when it does not fit right or below).
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

    // After spending/removing with the tooltip open, refresh its text (rank and colors).
    function refreshTooltip(talent, event){
        if(tooltipSlug !== talent.slug) return;
        tooltip.innerHTML = tooltipHtml(talent);
        if(event) placeTooltip(event);
    }

    // 7x4 = 28 cells (some empty: the real Holy tree has 17 talents)
    for(let r=1; r<=7; r++){
    for(let c=1; c<=4; c++){

        const talent = tree.talents.find(item => item.row===r && item.col===c);
        const cell = document.createElement('div');
        cell.style.gridRow = r;
        cell.style.gridColumn = c;
        // Empty slot: WoW renders no box, just the background. Keep the grid
        // hole transparent instead of painting ghost rectangles.
        if(!talent){
            cell.className = 'h-16';
        } else {
            // WoW-style slot: ONLY the 44px icon, centered, + "0/5" rank
            // overlaid bottom-right. No name, no background, no rectangle.
            cell.className = 'relative flex items-center justify-center h-16';
            const iconImage = document.createElement('img');
            iconImage.alt = talent.name;
            // 2px border colored by updateVisuals(): green = available,
            // yellow = maxed, gray = locked.
            iconImage.className = 'w-11 h-11 rounded border-2';
            iconImage.style.borderStyle = 'solid';
            const iconSrc = iconUrl(talent, 'medium');
            if(iconSrc){
                iconImage.src = iconSrc;
                // Dead icon URL: drop the img, the rank stays as placeholder.
                iconImage.onerror = () => iconImage.remove();
            }
            cell.appendChild(iconImage);
            // In-game style overlaid rank: bottom-right corner OF THE ICON
            // (relative wrapper), black outline for readability, clicks pass
            // through (pointer-events-none). A <div> avoids matching the <span>.
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
        // (No native title: replaced by the custom Wowhead-style tooltip below.)

        // Talent clicks: update state plus the rank <span> only (the <img> stays).
        if(talent){
        const refreshLabel = () => {
            const label = cell.querySelector('span');
            if (label) label.textContent = `${state[talent.slug]}/${talent.max_rank}`;
        };
        cell.onclick = (event) => { // Left click spends a point.
            if(canSpend(talent, tree)){ state[talent.slug]++; refreshLabel();
            updateCounter(); updateVisuals(); refreshTooltip(talent, event);} // repaint: may unlock rows or hit the 51 cap
        };
        cell.oncontextmenu = (event) => { // Right click removes a point.
            event.preventDefault();
            if(canRemove(talent, tree)){ state[talent.slug]--; refreshLabel();
            updateCounter(); updateVisuals(); refreshTooltip(talent, event); } // repaint: may lock upper rows again
        };
        // Wowhead-style hover: show on enter, follow the mouse, hide on leave.
        // Talent cells only.
        cell.addEventListener('mouseenter', (event) => showTooltip(event, talent));
        cell.addEventListener('mousemove', placeTooltip);
        cell.addEventListener('mouseleave', hideTooltip);
        }
        if(talent) cells[talent.slug] = cell; // Keep the cell to repaint its state in updateVisuals()
        grid.appendChild(cell);
    }
    }
    // Initial state: at 0 points only row 1 is available; the rest renders gray.
    updateVisuals();
    // Trace dependency arrows (cells must exist first so they can be measured).
    drawArrows();
    // Responsive width changes the coordinates: redraw.
    window.addEventListener('resize', drawArrows);
})
// Catch any failure (network, API 500, treeless JSON) and show it on screen.
// Without this catch the error would be "Cannot read properties of undefined (reading '0')"
.catch(error => {
    const div = document.getElementById('trees');
    if(div) div.innerHTML = `<p class="text-red-400">Error loading talents: ${error.message}</p>`;
    console.error('[paladin] failed loading /api/paladin:', error);
});
