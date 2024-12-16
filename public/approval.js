document.addEventListener('DOMContentLoaded', async () => {
    const usersResponse = await fetch('/pendingUsers');
    const users = await usersResponse.json();
    populateUsersTable(users);
    const storesResponse = await fetch('/pendingStores');
    const stores = await storesResponse.json();
    populateStoresTable(stores);

    const modal = document.getElementById('imageModal');

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});

function showModal(imageSrc) {
    modal.style.display = 'block';
    modalImage.src = imageSrc;
}

function translateStatus(status) {
    switch (status) {
        case 'pending': return 'ממתין לאישור';
        case 'waiting': return 'ממתין למידע נוסף';
        case 'declined': return 'נדחה';
        default: return 'לא ידוע';
    }
}

async function handleAction(action, userId) {
    const response = await fetch(`/users/${action}/${userId}`, { method: 'POST' });
    if (response.ok) {
        const result = await response.json();
        alert(`המשתמש ${action} בהצלחה!`);
        window.location.reload();
        return result; 
    } else {
        alert(`כשלון ב-${action} המשתמש.`);
        return null; 
    }
}

async function handleStoreAction(action, storeId, userId) {
    const response = await fetch(`/stores/${action}/${storeId}/${userId}`, { method: 'POST' });
    if (response.ok) {
        alert(`החנות ${action} בהצלחה!`);
        window.location.reload();
        return true; 
    } else {
        alert(`כשלון ב-${action} החנות.`);
        return false; 
    }
}


async function getUserByEmail(email) {
    const response = await fetch(`/getUserByEmail?email=${encodeURIComponent(email)}`);
    if (response.ok) {
        return response.json(); 
    } else {
        alert('כשלון במציאת משתמש');
        return null;
    }
}

function populateUsersTable(users) {
    const usersTable = document.getElementById('usersTable').getElementsByTagName('tbody')[0];
    users
        .filter(user => !user.isApproved)  
        .forEach(user => {

            const row = usersTable.insertRow();

            const profilePicCell = row.insertCell(0);
            const img = document.createElement('img');
            img.src = user.profilePic || 'default.png';
            img.alt = user.name || 'תמונה לא זמינה';
            img.style.width = '50px';
            img.style.height = '50px';
            img.style.cursor = 'pointer';
            img.onclick = () => showModal(user.profilePic || 'default.png');
            profilePicCell.appendChild(img);

            row.insertCell(1).textContent = user.name || 'שם לא ידוע';
            row.insertCell(2).textContent = user.email || 'אימייל לא ידוע';
            row.insertCell(3).textContent = user.phone || 'טלפון לא ידוע';
            row.insertCell(4).textContent = user.id || 'תעודת זהות לא ידועה';
            row.insertCell(5).textContent = user.interests ? user.interests.join(', ') : 'ללא תחומי עניין';

            const socialMediaCell = row.insertCell(6);
            if (user.socialMediaLinks) {
                const link = document.createElement('a');
                link.href = user.socialMediaLinks;
                link.target = '_blank';
                link.textContent = 'קישור';
                socialMediaCell.appendChild(link);
            } else {
                socialMediaCell.textContent = 'ללא קישור';
            }

            row.insertCell(7).textContent = translateStatus(user.status);

            const storeCell = row.insertCell(8);
            if (user.storeData) {
                storeCell.textContent = 'חנות ממתינה לאישור';
            } else {
                storeCell.textContent = 'אין חנות';
            }

            const actionsCell = row.insertCell(9);
            const approveUserButton = document.createElement('button');
            approveUserButton.textContent = 'אישור משתמש';
            approveUserButton.onclick = async () => {
                const response = await handleAction('approve', user.docID);
                if (response) {
                    const { uid } = response;
                    approveStoreButton.disabled = false; 
                    approveStoreButton.disabled = false; 
                    approveUserButton.style.display = 'none';
                    requestMoreInfoUserButton.style.display = 'none';
                    declineUserButton.style.display = 'none';
                    user.approvedUserId = uid; 
                }
            };
            actionsCell.appendChild(approveUserButton);

            const requestMoreInfoUserButton = document.createElement('button');
            requestMoreInfoUserButton.textContent = 'בקשת מידע נוסף';
            requestMoreInfoUserButton.onclick = () => handleAction('requestMoreInfo', user.docID);
            actionsCell.appendChild(requestMoreInfoUserButton);

            const declineUserButton = document.createElement('button');
            declineUserButton.textContent = 'דחייה';
            declineUserButton.onclick = () => handleAction('decline', user.docID);
            actionsCell.appendChild(declineUserButton);

            let approveStoreButton;
        });
}


function populateStoresTable(stores) {
    const storesTable = document.getElementById('storesTable').getElementsByTagName('tbody')[0];
    stores.forEach(store => {
        const row = storesTable.insertRow();

        row.insertCell(0).textContent = store.storeName || 'שם לא ידוע';
        row.insertCell(1).textContent = store.businessNumber || 'מספר לא ידוע';
        row.insertCell(2).textContent = store.phone || 'טלפון לא ידוע';
        row.insertCell(3).textContent = store.whatsapp || 'וואטסאפ לא ידוע';
        row.insertCell(4).textContent = store.email || 'אימייל לא ידוע';
        row.insertCell(5).textContent = store.address || 'כתובת לא ידועה';
        row.insertCell(6).textContent = store.bankName || 'שם בנק לא ידוע';
        row.insertCell(7).textContent = store.branchNumber || 'מספר סניף לא ידוע';
        row.insertCell(8).textContent = store.accountNumber || 'מספר חשבון לא ידוע';
        row.insertCell(9).innerHTML = store.storeLink ? `<a href="${store.storeLink}" target="_blank">${store.storeLink}</a>` : 'אין קישור';

        // User Information
        const userCell = row.insertCell(10);
        if (store.userData) {
            userCell.innerHTML = `
                <div><strong>שם:</strong> ${store.userData.name || 'לא ידוע'}</div>
                <div><strong>אימייל:</strong> ${store.userData.email || 'לא ידוע'}</div>
            `;
        } else {
            userCell.textContent = 'מידע על המשתמש לא זמין';
        }

        // Status
        row.insertCell(11).textContent = translateStatus(store.status);

        const actionsCell = row.insertCell(12);
        const approveButton = document.createElement('button');
        approveButton.textContent = 'אישור חנות';
        approveButton.onclick = async () => {
            const userId = store.userData && store.userData.approvedUserId ? store.userData.approvedUserId : await getApprovedUserId(store.userId);
            if (userId) {
                const storeApprovalSuccess = await handleStoreAction('approve', store.id, userId);
                if (storeApprovalSuccess) {
                    window.location.reload();
                }
            } else {
                alert('User approval required before approving the store.');
            }
        };
        actionsCell.appendChild(approveButton);


        const requestMoreInfoButton = document.createElement('button');
        requestMoreInfoButton.textContent = 'בקשת מידע נוסף';
        requestMoreInfoButton.onclick = () => handleStoreAction('requestMoreInfo', store.id);
        actionsCell.appendChild(requestMoreInfoButton);

        const declineButton = document.createElement('button');
        declineButton.textContent = 'דחייה';
        declineButton.onclick = () => handleStoreAction('decline', store.id);
        actionsCell.appendChild(declineButton);
    });
}

async function getApprovedUserId(pendingUserId) {
    const response = await fetch(`/getUserByPendingId/${pendingUserId}`);
    if (response.ok) {
        const user = await response.json();
        return user.uid;
    } else {
        alert('Failed to retrieve approved user ID.');
        return null;
    }
}



let isEditMode = false;
let editCategoryId = null;
let topicData = [];

const apiUrl = '/api/topics';

async function fetchTopics() {
    try {
        const response = await fetch(apiUrl);
        topicData = await response.json();

        const tableBody = document.getElementById('categoriesTable').querySelector('tbody');
        tableBody.innerHTML = ''; 

        topicData.forEach(topic => {
            tableBody.innerHTML += `
                <tr>
                    <td>${topic.name.he}</td>
                    <td>${topic.name.en}</td>
                    <td>${topic['Guarantees']}</td>
                    <td>${topic['Hours']}</td>
                    <td>${topic['Discount by People']}</td>
                    <td>${topic['Discount by Time']}</td>
                    <td>${topic['Hours for Activation']}</td>
                    <td>${topic['Guarantee for Activation']}</td>
                    <td>
                        <button onclick="openEditModal('${topic.id}')">ערוך</button>
                        <button onclick="deleteTopic('${topic.id}')">מחק</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching topics:", error);
    }
}

document.getElementById('openModalBtn').addEventListener('click', () => {
    openEditModal();
});

function openEditModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    modal.style.display = 'block';

    if (categoryId) {
        isEditMode = true;
        editCategoryId = categoryId;
        const topic = topicData.find(topic => topic.id === categoryId); 

        document.getElementById('categoryName').value = topic.name.he;
        document.getElementById('categoryNameEn').value = topic.name.en;
        document.getElementById('guarantees').value = topic['Guarantees'];
        document.getElementById('hours').value = topic['Hours'];
        document.getElementById('peopleDiscount').value = topic['Discount by People'];
        document.getElementById('timeDiscount').value = topic['Discount by Time'];
        document.getElementById('timeIncrement').value = topic['Hours for Activation'];
        document.getElementById('guaranteeIncrement').value = topic['Guarantee for Activation'];
    } else {
        isEditMode = false;
        editCategoryId = null;
        clearForm();
    }
}


async function saveCategory() {
    const categoryData = {
        name: {
            he: document.getElementById('categoryName').value,
            en: document.getElementById('categoryNameEn').value
        },
        'Guarantees': parseInt(document.getElementById('guarantees').value),
        'Hours': parseInt(document.getElementById('hours').value),
        'Discount by People': parseFloat(document.getElementById('peopleDiscount').value),
        'Discount by Time': parseFloat(document.getElementById('timeDiscount').value),
        'Hours for Activation': parseInt(document.getElementById('timeIncrement').value),
        'Guarantee for Activation': parseInt(document.getElementById('guaranteeIncrement').value)
    };

    if (isEditMode && editCategoryId) {
        await fetch(`${apiUrl}/${editCategoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        }).then(response => {
            if (response.ok) {
                console.log("Category updated successfully");
            } else {
                console.error("Error updating category");
            }
        });
    } else {
        await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        }).then(response => {
            if (response.ok) {
                console.log("New category added successfully");
            } else {
                console.error("Error adding new category");
            }
        });
    }

    closeModal();
    fetchTopics();
}

function clearForm() {
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryNameEn').value = '';
    document.getElementById('guarantees').value = '';
    document.getElementById('hours').value = '';
    document.getElementById('peopleDiscount').value = '';
    document.getElementById('timeDiscount').value = '';
    document.getElementById('timeIncrement').value = '';
    document.getElementById('guaranteeIncrement').value = '';
}

function closeModal() {
    document.getElementById('categoryModal').style.display = 'none';
    isEditMode = false;
    editCategoryId = null;
}

document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);
document.getElementById('closeModalBtn').addEventListener('click', closeModal);

async function deleteTopic(id) {
    const confirmation = confirm("האם אתה בטוח שברצונך למחוק את הקטגוריה?");
    
    if (!confirmation) {
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            console.log("Topic deleted successfully");
            fetchTopics(); 
        } else {
            console.error("Error deleting topic");
        }
    } catch (error) {
        console.error("Error deleting topic:", error);
    }
}



fetchTopics();
loadPendingProducts();



let categories = {};

async function fetchCategories() {
    try {
        const response = await fetch('/api/topics');
        const topics = await response.json();

        topics.forEach(topic => {
            categories[topic.name.he] = topic; 
        });
        console.log("Fetched categories:", categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

async function loadPendingProducts() {
    try {
        await fetchCategories();

        const response = await fetch('/pendingProducts');
        const products = await response.json();
        const productsTableBody = document.getElementById('productsTable').querySelector('tbody');

        productsTableBody.innerHTML = ''; 

        products.forEach(product => {
            console.log(product);
            const row = productsTableBody.insertRow();
            row.insertCell().textContent = product.category;
            const imgCell = row.insertCell();
            const img = document.createElement('img');
            img.src = product.image;
            img.alt = product.name;
            img.style.width = '50px';
            imgCell.appendChild(img);
            row.insertCell().textContent = product.name;
            row.insertCell().textContent = product.payments;
            row.insertCell().textContent = product.price;
            row.insertCell().textContent = product.minPrice;
            row.insertCell().textContent = product.specifications;
            row.insertCell().textContent = product.warranty;
            row.insertCell().textContent = product.year;
            row.insertCell().textContent = product.stock;
            row.insertCell().textContent = product.allowMultiplePurchases ? product.maxPurchasesPerUser : "1";
            row.insertCell().textContent = product.storeData
                ? `${product.storeData.storeName || 'N/A'} - ${product.storeData.phone || 'N/A'}`
                : 'N/A';

            const actionsCell = row.insertCell();

            const approveButton = document.createElement('button');
            approveButton.textContent = 'אשר';
            approveButton.onclick = () => toggleApprovalForm(product.id, product.category, product.price); 
            actionsCell.appendChild(approveButton);

            const declineButton = document.createElement('button');
            declineButton.textContent = 'דחה';
            declineButton.onclick = () => declineProduct(product.id);
            actionsCell.appendChild(declineButton);

            const formRow = productsTableBody.insertRow();
            formRow.id = `formRow-${product.id}`;
            formRow.style.display = 'none'; 
            const formCell = formRow.insertCell();
            formCell.colSpan = 12;

            formCell.innerHTML = `
                <div class="form-row">
                    <div class="form-row-full">
                        <label for="categorySelect-${product.id}">בחר קטגוריה:</label>
                        <select id="categorySelect-${product.id}" onchange="fillCategoryDetails('${product.id}', ${product.price})"></select>
                    </div>
                    <div class="form-row-full">
                        <div class="input-row">
                            <div class="input-group">
                                <label for="guaranteesAmount-${product.id}">כמות ערבים:</label>
                                <input type="number" id="guaranteesAmount-${product.id}" />
                            </div>
                            <div class="input-group">
                                <label for="guaranteeDays-${product.id}">מספר שעות:</label>
                                <input type="number" id="guaranteeDays-${product.id}" />
                            </div>
                            <div class="input-group">
                                <label for="guaranteePayment-${product.id}">סכום ערבות:</label>
                                <input type="number" id="guaranteePayment-${product.id}" readonly />
                            </div>
                        </div>
                    </div>
                    <div class="form-row-full">
                        <div class="input-row">
                            <div class="input-group">
                                <label for="timeDiscount-${product.id}"> אחוז הנחה על כל X:</label>
                                <input type="number" id="timeDiscount-${product.id}" placeholder="אחוז הנחה" />
                                <input type="number" id="timeDiscountValue-${product.id}" placeholder="X" />
                            </div>
                            <div class="input-group">
                                <label for="peopleDiscount-${product.id}"> אחוז הנחה על כל X <span id="peopleUnitLabel-${product.id}">ערבים נוספים</span>:</label>
                                <input type="number" id="peopleDiscount-${product.id}" placeholder="אחוז הנחה" />
                                <input type="number" id="peopleDiscountValue-${product.id}" placeholder="X" />
                            </div>
                        </div>
                    </div>
                    <button onclick="approveProductWithDetails('${product.id}')">אשר מוצר</button>
                </div>
            `;

            populateCategoryDropdown(product.id, product.category, product.price);
        });
    } catch (error) {
        console.error('Error loading pending products:', error);
    }
}

function populateCategoryDropdown(productId, selectedCategory, productPrice) {
    const categorySelect = document.getElementById(`categorySelect-${productId}`);

    categorySelect.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.textContent = 'בחר';
    placeholderOption.value = ''; 
    placeholderOption.disabled = true; 
    placeholderOption.selected = true; 
    categorySelect.appendChild(placeholderOption);

    Object.keys(categories).forEach(categoryName => {
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        if (categoryName === selectedCategory) {
            option.selected = true; 
        }
        categorySelect.appendChild(option);
    });

    if (selectedCategory) {
        categorySelect.value = selectedCategory;
        fillCategoryDetails(productId, productPrice);
    }
}


function toggleApprovalForm(productId, selectedCategory, productPrice) {
    const formRow = document.getElementById(`formRow-${productId}`);
    formRow.style.display = formRow.style.display === 'none' ? 'table-row' : 'none';

    populateCategoryDropdown(productId, selectedCategory, productPrice);
}


function fillCategoryDetails(productId, productPrice, selectedCategory = null) {
    const categorySelect = document.getElementById(`categorySelect-${productId}`);
    const chosenCategory = selectedCategory || categorySelect.value;

    if (chosenCategory && categories[chosenCategory]) {
        const categoryData = categories[chosenCategory];

        document.getElementById(`guaranteesAmount-${productId}`).value = categoryData.Guarantees || '';
        document.getElementById(`guaranteeDays-${productId}`).value = categoryData.Hours || '';
        document.getElementById(`timeDiscount-${productId}`).value = categoryData['Discount by Time'] || '';
        document.getElementById(`peopleDiscount-${productId}`).value = categoryData['Discount by People'] || '';
        document.getElementById(`timeDiscountValue-${productId}`).value = categoryData['Hours for Activation'] || '';
        document.getElementById(`peopleDiscountValue-${productId}`).value = categoryData['Guarantee for Activation'] || '';
        document.getElementById(`peopleUnitLabel-${productId}`).textContent = `ערבים נוספים`;

        const guaranteesAmount = categoryData.Guarantees || 1;
        const guaranteePayment = Math.ceil(productPrice / guaranteesAmount);
        document.getElementById(`guaranteePayment-${productId}`).value = guaranteePayment;
    } else {
        document.getElementById(`guaranteesAmount-${productId}`).value = '';
        document.getElementById(`guaranteeDays-${productId}`).value = '';
        document.getElementById(`timeDiscount-${productId}`).value = '';
        document.getElementById(`peopleDiscount-${productId}`).value = '';
        document.getElementById(`timeDiscountValue-${productId}`).value = '';
        document.getElementById(`peopleDiscountValue-${productId}`).value = '';
        document.getElementById(`guaranteePayment-${productId}`).value = '';
    }
}



async function approveProductWithDetails(productId) {
    const guaranteesAmount = document.getElementById(`guaranteesAmount-${productId}`).value;
    const guaranteePayment = document.getElementById(`guaranteePayment-${productId}`).value;
    const guaranteeDays = document.getElementById(`guaranteeDays-${productId}`).value;
    const timeDiscount = document.getElementById(`timeDiscount-${productId}`).value;
    const timeDiscountValue = document.getElementById(`timeDiscountValue-${productId}`).value;
    const peopleDiscount = document.getElementById(`peopleDiscount-${productId}`).value;
    const peopleDiscountValue = document.getElementById(`peopleDiscountValue-${productId}`).value;

    const response = await fetch(`/products/approve/${productId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            guaranteesAmount: parseInt(guaranteesAmount, 10),
            guaranteePayment: parseFloat(guaranteePayment),
            guaranteeDays: parseInt(guaranteeDays, 10),
            timeDiscount: parseFloat(timeDiscount),
            timeDiscountValue: parseInt(timeDiscountValue, 10),
            peopleDiscount: parseFloat(peopleDiscount),
            peopleDiscountValue: parseInt(peopleDiscountValue, 10),
        }),
    });

    if (response.ok) {
        alert('Product approved successfully');
        loadPendingProducts(); 
    } else {
        alert('Failed to approve product');
    }
}



async function declineProduct(productId) {
    const response = await fetch(`/products/decline/${productId}`, {
        method: 'POST'
    });

    if (response.ok) {
        alert('Product declined successfully');
        loadPendingProducts(); 
    } else {
        alert('Failed to decline product');
    }
}



