fetch('/api/paladin')
    .then(response => response.json())
    .then(data => {
        const div = document.getElementById('trees');
        div.innerHTML = '';
        data.trees.forEach(tree => {
            const h2 = document.createElement('h2');
            h2.className = 'text-xl font-semibold mb-2 mt-6';
            h2.textContent = `${tree.name} (${tree.talents.length} talentos)`;
            div.appendChild(h2);
            
            tree.talents.forEach(t => {
                const b = document.createElement('div');
                b.className = 'p-2 mb-1 rounded bg-neutral-800 border border-neutral-700';
                b.textContent = `F${t.row}C${t.col} - ${t.name} [${t.status}] ${t.is_gold ? '★' : ''} ${t.max_rank}pts`;
                div.appendChild(b);
            });
        });
    });