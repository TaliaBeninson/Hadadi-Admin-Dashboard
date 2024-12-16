let transactions = []; 
let filteredRows = []; 

let sortOrder = {
    date: 'asc',  
    status: 'asc'
};

document.addEventListener('DOMContentLoaded', async () => {
    const transactionsTableBody = document.querySelector('#transactionsTable tbody');
    const noTransactionsRow = document.getElementById('noTransactionsRow');

    try {
        const response = await fetch('/api/transactions');
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        transactions = await response.json();
        
        if (transactions.length === 0) {
            noTransactionsRow.style.display = 'table-row';
            return;
        }

        populateTable(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
});

function populateTable(data) {
    console.log(data)
    const transactionsTableBody = document.querySelector('#transactionsTable tbody');
    transactionsTableBody.innerHTML = ''; 

    data.forEach(transaction => {
        const row = document.createElement('tr');

        const buyerNameCell = document.createElement('td');
        const guarantorNameCell = document.createElement('td');
        const itemNameCell = document.createElement('td');
        const guaranteeAmountCell = document.createElement('td');
        const purchaseDateCell = document.createElement('td');
        const statusCell = document.createElement('td');
        const sellerNameCell = document.createElement('td');

        buyerNameCell.textContent = transaction.buyerName || 'לא זמין';
        guarantorNameCell.textContent = transaction.guarantorName || 'לא קיימים ערבים';
        itemNameCell.textContent = transaction.itemName;
        guaranteeAmountCell.textContent = transaction.guaranteePayment;

        if (transaction.purchaseDate && transaction.purchaseDate._seconds) {
            const purchaseDate = new Date(transaction.purchaseDate._seconds * 1000).toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            purchaseDateCell.textContent = purchaseDate;
            purchaseDateCell.dataset.date = new Date(transaction.purchaseDate._seconds * 1000).toISOString().split('T')[0]; // For filtering
        } else {
            purchaseDateCell.textContent = 'לא זמין';
        }

        const remainingGuarantees = transaction.guaranteesAmount - (transaction.guarantees ? transaction.guarantees.length : 0);
        const statusText = remainingGuarantees <= 0 ? 'הושלם' : `${remainingGuarantees} ערבויות נותרו`;
        statusCell.textContent = statusText;
        statusCell.dataset.status = remainingGuarantees <= 0 ? 'הושלם' : 'נותרו ערבויות';

        sellerNameCell.textContent = transaction.sellerName;

        row.appendChild(buyerNameCell);
        row.appendChild(guarantorNameCell);
        row.appendChild(itemNameCell);
        row.appendChild(guaranteeAmountCell);
        row.appendChild(purchaseDateCell);
        row.appendChild(statusCell);
        row.appendChild(sellerNameCell);

        transactionsTableBody.appendChild(row);
    });

    filteredRows = [...data]; // Update the filteredRows array
}

// Filter Function
function filterTable() {
    const globalSearch = document.getElementById('globalSearch').value.toLowerCase();
    const productFilter = document.getElementById('productFilter').value.toLowerCase();
    const sellerFilter = document.getElementById('sellerFilter').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;

    filteredRows = transactions.filter(transaction => {
        const buyerName = transaction.buyerName.toLowerCase();
        const guarantorName = transaction.guarantorName.toLowerCase();
        const itemName = transaction.itemName.toLowerCase();
        const guaranteeAmount = transaction.guaranteePayment !== null ? String(transaction.guaranteePayment).toLowerCase() : ''; 
        const purchaseDate = transaction.purchaseDate ? new Date(transaction.purchaseDate._seconds * 1000).toISOString().split('T')[0] : '';
        const guaranteesLength = transaction.guarantees ? transaction.guarantees.length : 0;
        const guaranteesAmount = transaction.guaranteesAmount || 0;
        const remainingGuarantees = guaranteesAmount - guaranteesLength;
        const status = remainingGuarantees <= 0 ? 'הושלם' : `${remainingGuarantees} ערבויות נותרו`;
        const sellerName = transaction.sellerName.toLowerCase();

        const matchesGlobalSearch = [buyerName, guarantorName, itemName, guaranteeAmount, purchaseDate, status, sellerName]
            .some(field => field.includes(globalSearch));

        const matchesProduct = !productFilter || itemName.includes(productFilter);
        const matchesSeller = !sellerFilter || sellerName.includes(sellerFilter);
        
        let matchesStatus = true;

        if (statusFilter === "הושלם") {
            matchesStatus = remainingGuarantees <= 0;
        } else if (statusFilter === "נותרו מתחת ערבויות") {
            matchesStatus = guaranteesLength >= (guaranteesAmount / 2) && remainingGuarantees > 0;
        } else if (statusFilter === "נותרו מעל ערבויות") {
            matchesStatus = guaranteesLength < (guaranteesAmount / 2) && remainingGuarantees > 0;
        }
        const matchesDate = !dateFilter || purchaseDate === dateFilter;
        return matchesGlobalSearch && matchesProduct && matchesSeller && matchesStatus && matchesDate;
    });

    console.log("Filtered Rows:", filteredRows);
    populateTable(filteredRows);
}




function toggleSort(column) {
    sortOrder[column] = sortOrder[column] === 'asc' ? 'desc' : 'asc';
    const order = sortOrder[column];

    filteredRows.sort((a, b) => {
        if (column === 'date') {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate._seconds * 1000) : new Date();
            const dateB = b.purchaseDate ? new Date(b.purchaseDate._seconds * 1000) : new Date();
            return order === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (column === 'status') {
            const statusA = a.guaranteesAmount - (a.guarantees ? a.guarantees.length : 0);
            const statusB = b.guaranteesAmount - (b.guarantees ? b.guarantees.length : 0);
            return order === 'asc' ? statusA - statusB : statusB - statusA;
        }
    });

    populateTable(filteredRows);
}
