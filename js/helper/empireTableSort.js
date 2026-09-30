export function toggleEmpireTableSort(module, header) {
    const table = header.closest('[data-empire-sort-table]');
    const tableKey = table.dataset.empireSortTable;
    const key = header.dataset.sortKey;
    const states = module.parent.empireTableSort ||= {};
    const previous = states[tableKey];
    const sameColumn = previous && previous.key === key;
    states[tableKey] = sameColumn && previous.direction === 'descending' ? null : {
        key,
        direction: sameColumn ? 'descending' : 'ascending'
    };
    applyEmpireTableSort(module);
}

export function applyEmpireTableSort(module) {
    const states = module.parent.empireTableSort ||= {};
    const order = new Map((module._cities || []).map((city, index) => [Number(city.id), index]));
    module.$el.find('[data-empire-sort-table]').each((index, table) => {
        const tableKey = table.dataset.empireSortTable;
        const headers = Array.from(table.tHead.querySelectorAll('th[data-sort-key]'));
        let sort = states[tableKey];
        const selected = sort && headers.find(header => header.dataset.sortKey === sort.key);
        if (!selected) sort = states[tableKey] = null;

        headers.forEach(header => {
            const direction = header === selected ? sort.direction : null;
            const action = direction === 'ascending' ? 'descending' : direction === 'descending' ? 'reset' : 'ascending';
            const label = `${header.title}: ${LANGUAGE.getLocalizedString(`empire.sort_${action}`)}`;
            $(header).attr('aria-sort', direction || 'none').find('.empire-table-sort')
                .attr({ title: label, 'aria-label': label });
        });

        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows).map(row => {
            const cell = sort && Array.from(row.cells).find(cell => cell.dataset.sortKey === sort.key);
            const raw = cell && cell.getAttribute('data-sort-value');
            const value = raw !== null && raw !== undefined && raw !== '' ? Number(raw) : NaN;
            return {
                row,
                value: Number.isFinite(value) ? value : null,
                order: order.get(Number(row.dataset.id)) ?? Number.MAX_SAFE_INTEGER
            };
        });
        rows.sort((a, b) => {
            if (sort) {
                // Unknown data belongs last in both directions; a known zero is sortable.
                if (a.value === null && b.value !== null) return 1;
                if (b.value === null && a.value !== null) return -1;
                const difference = (a.value - b.value) * (sort.direction === 'ascending' ? 1 : -1);
                if (difference) return difference;
            }
            return a.order - b.order;
        });

        // Preserve text-node slots for the incremental patcher and keep scroll positions.
        const scroller = table.parentElement;
        const scrollLeft = scroller.scrollLeft;
        const scrollTop = scroller.scrollTop;
        const nodes = Array.from(tbody.childNodes);
        let rowIndex = 0;
        const sortedNodes = nodes.map(node => node.nodeName === 'TR' ? rows[rowIndex++].row : node);
        if (sortedNodes.some((node, index) => node !== nodes[index])) tbody.append(...sortedNodes);
        scroller.scrollLeft = scrollLeft;
        scroller.scrollTop = scrollTop;
    });
}
