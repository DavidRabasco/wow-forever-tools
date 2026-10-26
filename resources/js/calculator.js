// Talent calculator - WoW Forever (level 60 = 51 points shared by 3 trees).
// ---------------------------------------------------------------------------
// Generic for every class: the endpoint comes from #trees data-api
// (e.g. /api/classes/warrior), set by the backend view per page.
// Data source: GET {api} -> { trees: [t1, t2, t3] }.
// Each talent comes from the DB with: id, slug, name, row (1-7), col (1-4),
// max_rank, requires_talent_id (FK or null), is_gold, status, description,
// icon (short name or null).
//
// Implemented classic/Forever rules (same for the 3 trees, 51-point pool shared):
//  1. Per-talent cap: state[slug] <= max_rank.
//  2. Row gate (per-row, strict): row R needs (R-1)*5 points in the rows
//     ABOVE it (rows 1..R-1 only; its own points never count).
//     E.g. row 2 needs 5 in row 1, row 7 needs 30 in rows 1-6.
//     Consequence: removing from row 1 with 5+1 leaves 4 supporting row 2,
//     so it is blocked (row 7 needs no exemption: its gate counts rows above).
//  3. Prerequisite: if requires_talent_id, the required talent must be maxed.
//  4. Capped pool: 51 at level 60, fewer below (level selector: level - 9).
//     Lowering the level trims picks from the end of the learn order.
//  5. Removing points (right click): not allowed if it would break the row gate
//     of another skilled talent, or leave a dependent without its prerequisite.
//  6. WoW-style visuals: cell = icon only + overlaid rank (no rectangles).
//     Thin green border = available, yellow = maxed, gray = locked
//     (grayscaled + dimmed icon). Repainted on every click.
//  7. WoW-style dependency arrows: SVG overlay per tree with one line from the
//     requirement to the dependent. Gray while unmet, gold once fulfilled.
//     Redrawn on resize.
//
// Controls: left click spends, right click removes (context menu blocked).
// Presentation per tree comes from the API (talent_trees.background/spec_icon):
// official Blizzard artwork + retail spec icon, framed WoW-style. If the
// artwork URL dies, the dark panel base still shows.
// Icons (c) Blizzard, educational use: the DB stores only 'spell_holy_x', the
// wow.zamimg.com URL is built here. Missing/broken icons fall back to text.
// The API URL and class slug travel in #trees data attributes so this file
// serves every class (data-api="/api/classes/warrior", data-class="warrior").
import { MAX_TOTAL_POINTS } from './calculator/constants.js';
import {
    canRemove as canRemoveRule,
    canSpend as canSpendRule,
    levelCap as levelCapRule,
    pointsAbove as pointsAboveRule,
    pointsInTree as pointsInTreeRule,
    rowRequirement as rowRequirementRule,
    totalPoints as totalPointsRule,
} from './calculator/rules.js';
import {
    decodePicks as decodePicksRule,
    encodePicks as encodePicksRule,
    orderedTalents as orderedTalentsRule,
} from './calculator/codec.js';

const apiMount = document.getElementById('trees');
const API_URL = apiMount?.dataset.api || '/api/classes/paladin';
const PAGE_CLASS = apiMount?.dataset.class || 'paladin';

// Static pages inline the payload next to the mount. That removes a network
// request and the layout shift that came with it. Laravel dev pages omit the
// script and fall back to the API endpoint.
const inlineData = document.getElementById('talent-data');
const dataPromise = inlineData
    ? Promise.resolve().then(() => JSON.parse(inlineData.textContent))
    : fetch(API_URL).then(response => {
        // If the API fails (500, 404, network down), response.ok is false:
        // show the error in #trees instead of crashing later.
        if(!response.ok) throw new Error(`API ${API_URL} returned ${response.status}`);
        return response.json();
    });

dataPromise
.then(data => {
    // The API must return { trees: [...] }. On an error JSON or parsed HTML,
    // data.trees does not exist: warn on screen instead of failing at data.trees[0].
    if(!data || !Array.isArray(data.trees) || data.trees.length === 0){
        throw new Error('API returned no data: data.trees is empty. Check storage/logs/laravel.log');
    }
    // Level 60 in Classic/Forever = 51 talent points (1 per level from 10).
    // MAX_TOTAL_POINTS is imported so the tests and the browser share it.
    // Active pool cap, lowered by the level selector (level 30 -> 21 points).
    let pointCap = MAX_TOTAL_POINTS;
    let currentLevel = 60;

    // Shared state: slug -> spent points (2/5, 0/3, etc.). Slugs are unique
    // across trees, so one flat map covers Holy + Protection + Retribution.
    let state = {};
    data.trees.forEach(tree => tree.talents.forEach(talent => state[talent.slug] = 0));

    // Learn order: one slug per spent point, in click order.
    // Spending pushes, removing splices that talent's LAST entry, so the list
    // always reads as a valid level-by-level progression.
    const pickOrder = []; // e.g. ['divine-strength', 'divine-strength', ...]
    // slug -> talent (any tree), to render the list without searching.
    const talentBySlug = {};
    data.trees.forEach(tree => tree.talents.forEach(talent => talentBySlug[talent.slug] = talent));

    // slug -> icon cell DOM, to repaint states without rebuilding the grids.
    const cells = {};

    const mount = document.getElementById('trees');
    mount.innerHTML = '';
    // The three trees side by side (wraps on narrow screens).
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap gap-8 justify-center';
    mount.appendChild(wrap);

    // Build the icon URL from wow.zamimg.com using the short name stored in the DB.
    // The DB stores only 'spell_holy_sealofsalvation', never the full URL or binary.
    // Icons (c) Blizzard, educational use. Missing ones (new in Forever) fall back
    // to placeholder via onerror.
    function iconUrl(talent, size = 'medium') {
        if (!talent.icon) return null;
        return `https://wow.zamimg.com/images/wow/icons/${size}/${talent.icon}.jpg`;
    }

    // Thin wrappers around the pure rules module. Keeping the live state here
    // means the click handlers and the render code stay unchanged.
    function pointsInTree(tree){ return pointsInTreeRule(tree, state); }

    // `st` defaults to the live state; canRemove passes its simulated state.
    function pointsAbove(tree, row, st = state){ return pointsAboveRule(tree, row, st); }

    function totalPoints(){ return totalPointsRule(data.trees, state); }

    function rowRequirement(talent){ return rowRequirementRule(talent); }

    function canSpend(talent, tree){
        return canSpendRule(talent, tree, data.trees, state, pointCap);
    }

    function canRemove(talent, tree){ return canRemoveRule(talent, tree, state); }

    // One view per tree: { tree, grid, counter, arrows, svg }.
    // Views share `state` (the 51-point pool) but paint independently.
    const views = data.trees.map(tree => buildTreeView(tree));

    // Build the DOM for one tree: framed panel with Blizzard artwork background,
    // header (spec icon + name), 7x4 grid of icon cells, branch counter.
    // Cells register in the shared `cells` map; clicks refresh ALL views because
    // spending here can lock/unlock the other trees through the shared pool.
    function buildTreeView(tree){
        const section = document.createElement('section');
        section.className = 'flex flex-col items-center p-4';
        // WoW-style frame: dark base (shows if the artwork fails to load) with
        // the tree artwork on top, dimmed by a black gradient so icons stay
        // readable. Gold double edge: outer dark line + bronze inner line.
        section.style.backgroundColor = '#0a0a12';
        if(tree.background){
            section.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url("${tree.background}")`;
            section.style.backgroundSize = 'cover';
            section.style.backgroundPosition = 'center top';
        }
        section.style.border = '2px solid #6b5a2e';
        section.style.outline = '1px solid #c9b037';
        section.style.outlineOffset = '-5px';
        section.style.borderRadius = '6px';
        section.style.boxShadow = '0 0 24px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.7)';

        // Header: official spec icon (zamimg, large) + tree name in gold.
        const header = document.createElement('div');
        header.className = 'flex items-center gap-2 mb-2';
        if(tree.spec_icon){
            const specImg = document.createElement('img');
            specImg.src = `https://wow.zamimg.com/images/wow/icons/large/${tree.spec_icon}.jpg`;
            specImg.alt = `${tree.name} specialization`;
            specImg.className = 'w-10 h-10 rounded';
            specImg.width = 40;
            specImg.height = 40;
            specImg.style.border = '2px solid #c9b037';
            // Dead icon URL: drop the img, the name still shows.
            specImg.onerror = () => specImg.remove();
            header.appendChild(specImg);
        }
        const title = document.createElement('h2');
        title.className = 'text-lg font-bold';
        title.style.color = '#ffd100';
        title.textContent = tree.name;
        header.appendChild(title);
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-4 gap-2 relative'; // relative: the arrow SVG positions over the grid
        grid.style.gridTemplateRows = 'repeat(7, 64px)';
        section.appendChild(grid);

        // Branch point counter, below its grid.
        const counter = document.createElement('div');
        counter.className = 'text-sm text-neutral-300 mt-2';
        counter.textContent = '0 points';
        section.appendChild(counter);

        // Per-tree reset: clears this branch only (its state + its picks),
        // leaving the other trees untouched.
        const treeSlugs = new Set(tree.talents.map(t => t.slug));
        const treeReset = document.createElement('button');
        treeReset.type = 'button';
        treeReset.title = `Reset ${tree.name} only`;
        treeReset.className = 'text-xs px-2 py-0.5 mt-1 rounded border border-neutral-700 bg-black/40 text-neutral-300 hover:text-red-400 hover:border-red-800';
        treeReset.textContent = 'reset';
        treeReset.addEventListener('click', () => {
            for(const slug of treeSlugs) state[slug] = 0;
            for(let i = pickOrder.length - 1; i >= 0; i--){
                if(treeSlugs.has(pickOrder[i])) pickOrder.splice(i, 1);
            }
            hideTooltip(); // it may show a stale rank
            refreshAll();
        });
        section.appendChild(treeReset);
        wrap.appendChild(section);

        const view = { tree, grid, counter, arrows: [], svg: null };

        // 7x4 = 28 cells (some empty: Holy has 17 talents, Protection 16, Retribution 17).
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
                iconImage.width = 44;
                iconImage.height = 44;
                // 2px border colored by updateVisuals(): green = available,
                // yellow = maxed, gray = locked.
                iconImage.className = 'w-11 h-11 rounded border-2';
                iconImage.style.borderStyle = 'solid';
                // Large source for retina displays; the cell renders it at 44px.
                const iconSrc = iconUrl(talent, 'large');
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
                // Gold pip: marquee talents (capstones, 21-pointers) carry a small
                // gold diamond at the corner. It avoids the icon border, which
                // encodes state (green/yellow/gray), so both signals coexist.
                if(talent.is_gold){
                    const pip = document.createElement('div');
                    pip.className = 'absolute -top-1 -left-1 w-2.5 h-2.5 rotate-45 pointer-events-none';
                    pip.style.background = '#ffd100';
                    pip.style.border = '1px solid #6b5a2e';
                    pip.style.boxShadow = '0 0 4px rgba(255,209,0,0.9)';
                    iconWrap.appendChild(pip);
                }
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
                updateCellAria();
            };
            const updateCellAria = () => {
                cell.setAttribute('aria-label', `${talent.name}, ${state[talent.slug]}/${talent.max_rank}`);
            };
            const spend = (event) => {
                if(!canSpend(talent, tree)) return;
                state[talent.slug]++;
                pickOrder.push(talent.slug);
                refreshLabel(); refreshAll(); syncShareUrl(); refreshTooltip(talent, tree, event);
            };
            const remove = (event) => {
                if(!canRemove(talent, tree)) return;
                state[talent.slug]--;
                // Drop this talent's most recent pick so the list stays a
                // valid learn sequence (canRemove guarantees one exists).
                const lastPick = pickOrder.lastIndexOf(talent.slug);
                if(lastPick !== -1) pickOrder.splice(lastPick, 1);
                refreshLabel(); refreshAll(); syncShareUrl(); refreshTooltip(talent, tree, event);
            };
            cell.tabIndex = 0;
            cell.setAttribute('role', 'button');
            updateCellAria();
            cell.onclick = (event) => spend(event); // Left click adds a point.
            cell.oncontextmenu = (event) => { // Right click removes a point.
                event.preventDefault();
                remove(event);
            };
            // Keyboard path: Enter/Space add, Delete/Backspace remove. Tab moves
            // between talents; focus also opens the tooltip for keyboard users.
            cell.addEventListener('keydown', (event) => {
                if(event.key === 'Enter' || event.key === ' '){
                    event.preventDefault();
                    spend(null);
                } else if(event.key === 'Delete' || event.key === 'Backspace'){
                    event.preventDefault();
                    remove(null);
                }
            });
            cell.addEventListener('focus', () => {
                cell.style.outline = '2px solid #ffd100';
                cell.style.outlineOffset = '2px';
                const rect = cell.getBoundingClientRect();
                showTooltip({
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                }, talent, tree);
            });
            cell.addEventListener('blur', () => {
                cell.style.outline = 'none';
                hideTooltip();
            });
            // Wowhead-style hover: show on enter, follow the mouse, hide on leave.
            cell.addEventListener('mouseenter', (event) => showTooltip(event, talent, tree));
            cell.addEventListener('mousemove', placeTooltip);
            cell.addEventListener('mouseleave', () => {
                if(document.activeElement !== cell) hideTooltip();
            });
            cells[talent.slug] = cell; // Keep the cell to repaint its state in updateVisuals()
            }
            grid.appendChild(cell);
        }
        }
        return view;
    }

    // Refresh every tree (counters + states + arrows), labels, remaining pool
    // and pick-order panel: spending in one tree can lock/unlock the others
    // through the shared 51-point pool.
    function refreshAll(){
        for(const view of views){ updateCounter(view); updateVisuals(view); }
        updateLabels();
        updateRemaining();
        renderPickOrder();
    }

    // Repaint every rank label from state. Per-click updates use refreshLabel
    // for the single cell; this full pass is for global actions (reset).
    function updateLabels(){
        for(const slug of Object.keys(cells)){
            const talent = talentBySlug[slug];
            const label = cells[slug].querySelector('span');
            if(talent && label){
                label.textContent = `${state[slug] || 0}/${talent.max_rank}`;
                cells[slug].setAttribute('aria-label', `${talent.name}, ${state[slug] || 0}/${talent.max_rank}`);
            }
        }
    }

    // Refresh the shared pool counter ("12 remaining").
    function updateRemaining(){
        const el = document.getElementById('points-remaining');
        if(!el) return; // safety: toolbar missing from the template
        el.textContent = `${pointCap - totalPoints()} remaining`;
    }

    // One-line status under the toolbar (share feedback, load errors...).
    function setShareStatus(message){
        const el = document.getElementById('share-status');
        if(el) el.textContent = message;
    }

    // Find a talent plus its tree view by slug (needed to replay shared picks
    // through canSpend, which requires the tree).
    function findTalentView(slug){
        for(const view of views){
            const talent = view.tree.talents.find(t => t.slug === slug);
            if(talent) return { talent, view };
        }
        return null;
    }

    // Pick-order panel (right side): one line per spent point, in learn order.
    // Line i was learned at level 10+i (first point at 10, Classic) with the
    // running rank (1/5, 2/5...). Header shows the character level: 9 + spent
    // points (51 pts = level 60). Rebuilt from pickOrder on every change.
    // Single scroll-free column; rows stay on one line (whitespace-nowrap).
    function renderPickOrder(){
        const list = document.getElementById('pick-order');
        const levelEl = document.getElementById('pick-level');
        if(!list) return; // safety: panel missing from the template
        const seen = {}; // slug -> ranks shown so far (running 1/5, 2/5...)
        list.innerHTML = '';
        if(pickOrder.length === 0){
            const empty = document.createElement('li');
            empty.className = 'text-neutral-400 text-sm';
            empty.textContent = 'No talents learned yet.';
            list.appendChild(empty);
        }
        pickOrder.forEach((slug, i) => {
            const talent = talentBySlug[slug];
            if(!talent) return; // safety: unknown slug, skip the line
            seen[slug] = (seen[slug] || 0) + 1;
            const row = document.createElement('li');
            row.className = 'flex items-center gap-2 text-xs py-0.5 whitespace-nowrap';
            const img = document.createElement('img');
            const src = iconUrl(talent, 'small');
            if(src){
                img.src = src;
                img.alt = '';
                img.className = 'w-5 h-5 rounded shrink-0';
                img.onerror = () => img.remove();
            }
            row.appendChild(img);
            const text = document.createElement('span');
            text.textContent = `Level ${10 + i} - ${talent.name} ${seen[slug]}/${talent.max_rank}`;
            row.appendChild(text);
            list.appendChild(row);
        });
        if(levelEl) levelEl.textContent = `Level ${Math.max(10, 9 + pickOrder.length)}`;
    }

    // Refresh one tree's branch counter ("12 points", green when 51 is reached).
    function updateCounter(view){
        const total = pointsInTree(view.tree);
        view.counter.textContent = `${total} points`;
        view.counter.style.color = total >= pointCap ? '#22c55e' : '';
    }

    // WoW-style dependency arrows (overlaid SVG per tree, no libraries).
    // ------------------------------------------------------------------
    // Each talent with requires_talent_id gets an arrow from its requirement.
    // The line runs edge to edge between icons through the cell corridor;
    // crossing an empty slot is normal, as in game.
    // Gray = requirement not maxed, gold = requirement fulfilled.

    // Paint one view's arrow colors from state. Split from tracing so every
    // click can call it without measuring the DOM again.
    function paintArrows(view){
        for(const arrow of view.arrows){
            const done = state[arrow.parent.slug] >= arrow.parent.max_rank;
            arrow.line.setAttribute('stroke', done ? '#ffd100' : '#6b7280');
            arrow.line.setAttribute('marker-end', done ? `url(#arrow-gold-${view.tree.slug})` : `url(#arrow-gray-${view.tree.slug})`);
        }
    }

    // Arrow endpoints: centers snapped to the dominant axis, from the parent
    // icon edge to the child icon edge (or the cell if the <img> failed).
    // All in px relative to the grid, which is the SVG coordinate system.
    function arrowEndpoints(view, fromCell, toCell){
        const fromBox = fromCell.querySelector('img') || fromCell;
        const toBox = toCell.querySelector('img') || toCell;
        const gridRect = view.grid.getBoundingClientRect();
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

    // Build one view's SVG layer and trace one line per dependency. Called on
    // load and on every resize (coordinates depend on the real grid width).
    // Marker ids carry the tree slug so the three SVGs never collide.
    function drawArrows(view){
        // Clear the previous tracing (resize re-measures everything).
        view.arrows.length = 0;
        if(view.svg) view.svg.remove();
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'absolute inset-0 pointer-events-none');
        svg.setAttribute('width', view.grid.clientWidth);
        svg.setAttribute('height', view.grid.clientHeight);
        // Arrowheads: one gray, one gold (fixed size, never scale).
        const defs = document.createElementNS(NS, 'defs');
        const heads = [[`arrow-gray-${view.tree.slug}`, '#6b7280'], [`arrow-gold-${view.tree.slug}`, '#ffd100']];
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
        svg.appendChild(defs);
        // Behind the icons: inserted first so it never covers them.
        view.grid.insertBefore(svg, view.grid.firstChild);
        view.svg = svg;
        // One line per required talent, from parent to child.
        for(const talent of view.tree.talents){
            if(!talent.requires_talent_id) continue; // no requirement = no arrow
            const parent = view.tree.talents.find(item => item.id === talent.requires_talent_id);
            const fromCell = parent && cells[parent.slug];
            const toCell = cells[talent.slug];
            if(!parent || !fromCell || !toCell) continue; // safety: broken data, no arrow
            const p = arrowEndpoints(view, fromCell, toCell);
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', p.x1);
            line.setAttribute('y1', p.y1);
            line.setAttribute('x2', p.x2);
            line.setAttribute('y2', p.y2);
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
            view.arrows.push({ line, parent });
        }
        paintArrows(view);
    }

    // Paint one view's talents by state, as in original WoW:
    //  - maxed (state == max_rank): YELLOW border, full-color icon.
    //  - available (canSpend): thin GREEN border, full-color icon, click cursor.
    //  - locked (missing row gate, missing prerequisite, or 51 cap): GRAY border,
    //    grayscaled + dimmed icon, blocked cursor.
    // Color goes on the <img> border (cells have no box anymore).
    function updateVisuals(view){
        for(const talent of view.tree.talents){
            const cell = cells[talent.slug];
            if(!cell) continue; // safety: missing cell must not break the rest
            const icon = cell.querySelector('img');
            const label = cell.querySelector('span');
            const maxed = state[talent.slug] >= talent.max_rank;
            const available = canSpend(talent, view.tree);
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
        paintArrows(view);
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

    // Tooltip HTML from current state (rebuilt on every hover and click).
    function tooltipHtml(talent, tree){
        const pts = state[talent.slug] || 0;
        // White name + current rank.
        let html = `<div style="color:#fff;font-weight:bold;font-size:14px">${talent.name}</div>`;
        html += `<div style="color:#fff">Rank ${pts}/${talent.max_rank}</div>`;
        // Body in yellow: verbatim per-rank texts when imported (ranks[]),
        // otherwise the hand-written summary (Paladin rows predate ranks).
        const ranks = Array.isArray(talent.ranks) && talent.ranks.length ? talent.ranks : null;
        // Active-ability meta (cost · type · cooldown · range) in gray.
        if(talent.skill){
            const range = talent.skill.range;
            const meta = [talent.skill.cost, talent.skill.type,
                talent.skill.cd ? `${talent.skill.cd} cooldown` : null,
                range ? (typeof range === 'number' ? `${range} yd range` : range) : null,
            ].filter(Boolean).join(' · ');
            if(meta) html += `<div style="color:#9d9d9d">${meta}</div>`;
        }
        if(ranks){
            const current = ranks[Math.min(pts, ranks.length - 1)];
            if(current) html += `<div style="color:#ffd100;margin-top:4px">${current}</div>`;
            // Next-rank preview while skilling, as on Wowhead.
            if(pts > 0 && pts < talent.max_rank && ranks[pts])
                html += `<div style="color:#fff;margin-top:4px">Next Rank:</div><div style="color:#ffd100">${ranks[pts]}</div>`;
        } else if(talent.description){
            html += `<div style="color:#ffd100;margin-top:4px">${talent.description}</div>`;
        }
        // Red requirements: strict row gate (rows above only) and unmaxed parent.
        const missing = [];
        const needPts = rowRequirement(talent);
        if(pointsAbove(tree, talent.row) < needPts) missing.push(`Requires ${needPts} points in ${tree.name}`);
        if(talent.requires_talent_id){
            const parent = tree.talents.find(item => item.id === talent.requires_talent_id);
            if(parent && (state[parent.slug] || 0) < parent.max_rank)
                missing.push(`Requires ${parent.max_rank} point${parent.max_rank > 1 ? 's' : ''} in ${parent.name}`);
        }
        for(const line of missing) html += `<div style="color:#ff4040;margin-top:4px">${line}</div>`;
        // When everything is met, green action: learn (takes points) or unlearn (maxed).
        if(missing.length === 0){
            if(pts < talent.max_rank && totalPoints() < pointCap)
                html += `<div style="color:#40ff40;margin-top:4px">Click to learn</div>`;
            else if(pts > 0)
                html += `<div style="color:#40ff40;margin-top:4px">Right-click to unlearn</div>`;
        }
        return html;
    }

    // Place the tooltip next to the cursor without leaving the viewport (flips
    // to the other side when it does not fit right or below).
    function placeTooltip(event){
        if(!event || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return;
        const pad = 16;
        tooltip.style.display = 'block';
        const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
        let x = event.clientX + pad, y = event.clientY + pad;
        if(x + w > window.innerWidth - 8) x = event.clientX - w - pad;
        if(y + h > window.innerHeight - 8) y = event.clientY - h - pad;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    function showTooltip(event, talent, tree){
        tooltipSlug = talent.slug;
        tooltip.innerHTML = tooltipHtml(talent, tree);
        placeTooltip(event);
    }

    function hideTooltip(){
        tooltipSlug = null;
        tooltip.style.display = 'none';
    }

    // After spending/removing with the tooltip open, refresh its text (rank and colors).
    function refreshTooltip(talent, tree, event){
        if(tooltipSlug !== talent.slug) return;
        tooltip.innerHTML = tooltipHtml(talent, tree);
        if(event) placeTooltip(event);
    }

    // Freeze the pick panel to the trees' height: cap it so the list scrolls
    // inside instead of growing the page. Measured live (icons have fixed
    // sizes, so layout is stable once built); re-synced on resize.
    function syncPanelHeight(){
        const panel = document.getElementById('pick-panel');
        const treesEl = document.getElementById('trees');
        if(!panel || !treesEl) return;
        panel.style.maxHeight = `${treesEl.offsetHeight}px`;
    }

    // Initial state: at 0 points only row 1 is available; the rest renders gray.
    refreshAll();
    // Level selector (10-60): caps the pool to level-9 points to simulate lower
    // levels (30 -> 21). Filled here so the template stays static.
    const levelSelect = document.getElementById('level-select');
    if(levelSelect){
        for(let level = 10; level <= 60; level++){
            const option = document.createElement('option');
            option.value = String(level);
            option.textContent = String(level);
            if(level === 60) option.selected = true;
            levelSelect.appendChild(option);
        }
        levelSelect.addEventListener('change', () => setLevel(parseInt(levelSelect.value, 10)));
    }
    // Apply a level cap, trimming picks from the END of the learn order while
    // over the new cap (most recent picks go first).
    function setLevel(level){
        if(!Number.isInteger(level)) return;
        currentLevel = Math.min(Math.max(level, 10), 60);
        if(levelSelect) levelSelect.value = String(currentLevel);
        pointCap = levelCapRule(currentLevel);
        while(totalPoints() > pointCap && pickOrder.length > 0){
            const slug = pickOrder.pop();
            if(state[slug] > 0) state[slug]--;
        }
        hideTooltip();
        refreshAll();
        syncShareUrl(); // address bar follows level trims too
    }
    // Global reset: wipe every point, empty the pick order, restore the pool.
    const resetBtn = document.getElementById('reset-build');
    if(resetBtn) resetBtn.addEventListener('click', () => {
        Object.keys(state).forEach(slug => state[slug] = 0);
        pickOrder.length = 0;
        setShareStatus('');
        setLevel(60); // full 51-point pool back (refreshes + clears the URL)
    });
    // Share is now just copy: the address bar already holds the live link
    // (syncShareUrl runs on every change).
    const shareBtn = document.getElementById('share-build');
    if(shareBtn) shareBtn.addEventListener('click', async () => {
        if(pickOrder.length === 0){ setShareStatus('Spend at least 1 point first.'); return; }
        syncShareUrl();
        try {
            await navigator.clipboard.writeText(location.href);
            setShareStatus('Link copied!');
        } catch {
            setShareStatus(location.href); // clipboard blocked: show the link to copy by hand
        }
    });
    // Live URL sync: every spend/remove keeps ?b= (+ &level) up to date via
    // replaceState (no reload, no history spam), so the address bar is always
    // the share link. The Share button stays for one-click clipboard copy.
    // Skipped when empty (clears the query instead).
    function syncShareUrl(){
        if(pickOrder.length === 0){
            if(location.search !== '') history.replaceState('', location.pathname);
            return;
        }
        const code = encodePicks();
        if(!code) return;
        const params = new URLSearchParams();
        params.set('b', code);
        if(currentLevel < 60) params.set('level', currentLevel);
        history.replaceState('', `?${params.toString()}`);
    }
    // Deterministic API order (trees by order, talents by row/col) keeps both
    // ends in sync without any database. The codec itself is a pure module.
    function orderedTalents(){ return orderedTalentsRule(data.trees); }
    function encodePicks(){ return encodePicksRule(pickOrder, data.trees); }
    function decodePicks(code){ return decodePicksRule(code, data.trees); }
    // Load a shared build (?b=code): replay its picks in order through the
    // same rules (canSpend), so a tampered link can never produce odd states.
    (function loadSharedBuild(){
        const params = new URLSearchParams(location.search);
        // Shared level cap applies before replaying (extra picks are refused
        // by canSpend, so a tampered URL stays legal).
        const sharedLevel = parseInt(params.get('level') || '', 10);
        if(sharedLevel >= 10 && sharedLevel <= 60) setLevel(sharedLevel);
        const code = params.get('b');
        if(!code) return;
        const slugs = decodePicks(code);
        if(!slugs){ setShareStatus('Could not load build: bad link.'); return; }
        Object.keys(state).forEach(slug => state[slug] = 0);
        pickOrder.length = 0;
        for(const slug of slugs){
            const entry = findTalentView(slug);
            if(entry && canSpend(entry.talent, entry.view.tree)){ state[slug]++; pickOrder.push(slug); }
        }
        refreshAll();
        syncShareUrl(); // normalize the URL to the loaded build
        setShareStatus(`Loaded shared build (${pickOrder.length} picks).`);
    })();
    // Trace dependency arrows (cells must exist first so they can be measured).
    views.forEach(drawArrows);
    syncPanelHeight();
    // Responsive width changes the coordinates: redraw. Panel height follows.
    window.addEventListener('resize', () => { views.forEach(drawArrows); syncPanelHeight(); });
})
// Catch any failure (network, API 500, treeless JSON) and show it on screen.
// Without this catch the error would be "Cannot read properties of undefined (reading '0')"
.catch(error => {
    const div = document.getElementById('trees');
    if(div) div.innerHTML = `<p class="text-red-400">Error loading talents: ${error.message}</p>`;
    console.error(`[calculator] failed loading ${API_URL}:`, error);
});
