const express = require('express');
const path = require('path');
const { admin, db } = require('./firebase'); 
const app = express();
const { sendEmail } = require('./emailService');


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


app.get('/approval', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'approval.html'));
  });

  app.get('/transactions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'transactions.html'));
  });


app.get('/pendingUsers', async (req, res) => {
    try {
        const usersSnapshot = await db.collection('pendingUsers').get();
        const users = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            const storeSnapshot = await db.collection('pendingStores')
                .where('userId', '==', userId)
                .get();

            let storeData = null;
            if (!storeSnapshot.empty) {
                storeData = storeSnapshot.docs[0].data(); 
                storeData.storeId = storeSnapshot.docs[0].id; 
            }

            users.push({ id: userId, ...userData, storeData });
        }

        res.json(users);
    } catch (error) {
        res.status(500).send('Error fetching pending users');
    }
});

app.post('/users/approve/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userDoc = await db.collection('pendingUsers').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).send('User document not found');
        }

        const userData = userDoc.data();
        const email = userData.email;
        const tempPassword = generateTempPassword();
        const userRecord = await admin.auth().getUserByEmail(email);

        await admin.auth().updateUser(userRecord.uid, { password: tempPassword });

        await db.collection('users').doc(userRecord.uid).set({
            ...userData,
            isPasswordTemporary: true,
            credits: 0,  
            guaranteesReceived: [],
            guaranteesProvided: [],  
            isApproved: true, 
            approvedUserId: userRecord.uid,  
        });

        if (userData.role === 'קונה') {
            await db.collection('pendingUsers').doc(userId).delete();
        } else if (userData.role === 'מוכר') {
            await db.collection('pendingUsers').doc(userId).update({
                isApproved: true,
                approvedUserId: userRecord.uid,
            });
        }

        await sendEmail(
            email,
            'אישור הרשמה',
            `<html dir="rtl"><body><p>החשבונך אושר בהצלחה. הסיסמה הזמנית שלך היא: <strong>${tempPassword}</strong>.</p></body></html>`
        );

        res.status(200).json({ message: 'User approved and password updated', uid: userRecord.uid });
    } catch (error) {
        console.error('Approval Error:', error);
        res.status(500).send('Approval failed');
    }
});



app.get('/pendingStores', async (req, res) => {
    try {
        const storesSnapshot = await db.collection('pendingStores').get();
        const stores = [];

        if (storesSnapshot.empty) {
            return res.json(stores);
        }

        for (const storeDoc of storesSnapshot.docs) {
            const storeData = storeDoc.data();
            const storeId = storeDoc.id;

            let userData = null;

            if (storeData.userId && typeof storeData.userId === 'string' && storeData.userId.trim() !== '') {
                let userDoc = await db.collection('users').doc(storeData.userId).get();
                if (!userDoc.exists) {
                    userDoc = await db.collection('pendingUsers').doc(storeData.userId).get();
                }

                if (userDoc.exists) {
                    userData = userDoc.data();
                }
            } else {
                console.error(`Invalid or missing userId for store: ${storeId}`);
            }

            stores.push({ id: storeId, ...storeData, userData });
        }

        res.json(stores);
    } catch (error) {
        console.error('Error fetching pending stores:', error);
        res.status(500).send('Error fetching pending stores');
    }
});


app.post('/stores/approve/:storeId/:userId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const userId = req.params.userId;

        const storeDoc = await db.collection('pendingStores').doc(storeId).get();
        if (!storeDoc.exists) {
            return res.status(404).send('Store document not found');
        }

        const storeData = storeDoc.data();

        await db.collection('stores').doc(storeId).set({
            ...storeData,
            ownerID: userId,  
            userId: userId,   
        });

        await db.collection('pendingStores').doc(storeId).delete();

        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            await db.collection('users').doc(userId).update({
                role: 'מוכר' 
            });
        } else {
            return res.status(404).send('User not found');
        }

        const pendingUserDoc = await db.collection('pendingUsers').doc(storeData.userId).get();
        if (pendingUserDoc.exists) {
            await db.collection('pendingUsers').doc(storeData.userId).delete();
        }

        res.status(200).send('Store approved, user role updated to מוכר, and pending user deleted');
    } catch (error) {
        console.error('Store Approval Error:', error);
        res.status(500).send('Store approval failed');
    }
});




app.get('/getUserByPendingId/:pendingUserId', async (req, res) => {
    try {
        const pendingUserId = req.params.pendingUserId;
        const userSnapshot = await db.collection('users').where('docID', '==', pendingUserId).get();
        
        if (userSnapshot.empty) {
            return res.status(404).send('User not found');
        }

        const user = userSnapshot.docs[0].data();
        res.json({ uid: userSnapshot.docs[0].id });
    } catch (error) {
        console.error('Error fetching approved user ID:', error);
        res.status(500).send('Error fetching approved user ID');
    }
});




app.post('/stores/requestMoreInfo/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const storeDoc = await db.collection('pendingStores').doc(storeId).get();
        const storeData = storeDoc.data();

        if (!storeData) {
            return res.status(404).send('Store not found');
        }

        await db.collection('pendingStores').doc(storeId).update({ status: 'waiting' });

        const userDoc = await db.collection('users').doc(storeData.userId).get();
        const userEmail = userDoc.data().email;

        await sendEmail(
            userEmail,
            'בקשת מידע נוסף לחנות',
            `<html dir="rtl"><body><p>שלום,</p><p>אנו זקוקים למידע נוסף לצורך השלמת רישום החנות שלך. אנא שלח את הפרטים החסרים למייל חוזר.</p><p>תודה, צוות הדדי.</p></body></html>`
        );

        res.status(200).send('More info requested');
    } catch (error) {
        console.error('Request More Info Error:', error);
        res.status(500).send('Request for more info failed');
    }
});

app.post('/users/delete/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        await db.collection('pendingUsers').doc(userId).delete();
        res.status(200).send('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
});



app.post('/users/decline/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userDoc = await db.collection('pendingUsers').doc(userId).get();
        const userData = userDoc.data();

        await db.collection('pendingUsers').doc(userId).update({ status: 'declined' });

        await sendEmail(
            userData.email,
            'הרשמה נדחתה',
            `<html dir="rtl"> <body> <p>שלום,</p> <p>אנו מצטערים להודיעך כי לא נוכל להמשיך בתהליך ההרשמה שלך בשלב זה. אני ממליצים לנסות שוב לבצע הרשמה בעוד 30 יום.</p> <p>לשאלות נוספות, אנא צור קשר עם צוות הדדי</p> <p>תודה, צוות הדדי.</p> </body> </html>`
        );

        res.status(200).send('User declined');
    } catch (error) {
        res.status(500).send('Decline failed');
    }
});

app.post('/users/requestMoreInfo/:docId', async (req, res) => {
    try {
        const docId = req.params.docId;
        const userDoc = await db.collection('pendingUsers').doc(docId).get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(404).send('User not found');
        }

        await db.collection('pendingUsers').doc(docId).update({ status: 'waiting' });

        await sendEmail(
            userData.email,
            'בקשת מידע נוסף',
            `<html dir="rtl"> <body> <p>שלום,</p> <p>לצורך השלמת תהליך ההרשמה שלך, אנא שלח במייל חוזר את הפרטים הבאים:</p> <ul> <li>תמונת תעודת זהות ו/או</li> <li> תמונת רשיון נהיגה ו/או</li> <li> קישור לרשת חברתית נוספת</li> </ul> <p>תודה על שיתוף הפעולה,<br>צוות הדדי.</p> </body> </html>`
        );

        res.status(200).send('More info requested');
    } catch (error) {
        console.error('Request More Info Error:', error);
        res.status(500).send('Request for more info failed');
    }
});

app.get('/getUserByEmail', async (req, res) => {
    const email = req.query.email;
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        res.json({ uid: userRecord.uid });
    } catch (error) {
        console.error('Error fetching user by email:', error);
        res.status(500).send('Error fetching user');
    }
});


app.post('/stores/decline/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const storeDoc = await db.collection('pendingStores').doc(storeId).get();
        const storeData = storeDoc.data();

        await db.collection('pendingStores').doc(storeId).update({ status: 'declined' });

        const userDoc = await db.collection('users').doc(storeData.userId).get();
        const userEmail = userDoc.data().email || storeData.email;

        await sendEmail(
            userEmail,
            'דחיית חנות',
            `<html dir="rtl"><body><p>שלום,</p><p>מצטערים להודיעך כי החנות שלך נדחתה.</p><p>תודה, צוות הדדי.</p></body></html>`
        );

        res.status(200).send('Store declined');
    } catch (error) {
        console.error('Decline Error:', error);
        res.status(500).send('Store decline failed');
    }
});


app.get('/pendingProducts', async (req, res) => {
    try {
        const productsSnapshot = await db.collection('pendingProducts').get();
        const products = [];

        for (const productDoc of productsSnapshot.docs) {
            const productData = productDoc.data();
            const storeDoc = await db.collection('stores').doc(productData.storeID).get();
            const storeData = storeDoc.exists ? storeDoc.data() : null;
            
            products.push({ id: productDoc.id, ...productData, storeData });
        }

        res.json(products);
    } catch (error) {
        console.error('Error fetching pending products:', error);
        res.status(500).send('Error fetching pending products');
    }
});


app.post('/products/approve/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const {
            guaranteesAmount,
            guaranteePayment,
            guaranteeDays,
            timeDiscount,
            timeDiscountValue,
            peopleDiscount,
            peopleDiscountValue,
        } = req.body;

        if (
            guaranteesAmount === undefined ||
            guaranteePayment === undefined ||
            guaranteeDays === undefined ||
            timeDiscount === undefined ||
            timeDiscountValue === undefined ||
            peopleDiscount === undefined ||
            peopleDiscountValue === undefined
        ) {
            return res.status(400).send('Missing guarantee details in the request body');
        }

        const productDoc = await db.collection('pendingProducts').doc(productId).get();
        if (!productDoc.exists) {
            return res.status(404).send('Product document not found');
        }
        const productData = productDoc.data();


        await db.collection('products').doc(productId).set({
            ...productData, 
            guaranteesAmount: guaranteesAmount,
            guaranteePayment: guaranteePayment,
            guaranteeDays: guaranteeDays,
            timeDiscount: timeDiscount,
            timeDiscountValue: timeDiscountValue,
            peopleDiscount: peopleDiscount,
            peopleDiscountValue: peopleDiscountValue,
        });

        await db.collection('pendingProducts').doc(productId).delete();
        const storeID = productData.storeID;
        const storeDoc = await db.collection('stores').doc(storeID).get();

        if (!storeDoc.exists) {
            return res.status(404).send('Store document not found');
        }

        const storeData = storeDoc.data();
        const updatedItems = storeData.items || [];
        updatedItems.push(productId);

        await db.collection('stores').doc(storeID).update({
            items: updatedItems,
        });

        res.status(200).send('Product approved and moved to products collection');
    } catch (error) {
        console.error('Approval Error:', error);
        res.status(500).send('Product approval failed');
    }
});



app.post('/products/decline/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;

        await db.collection('pendingProducts').doc(productId).update({ status: 'declined' });

        res.status(200).send('Product declined');
    } catch (error) {
        console.error('Decline Error:', error);
        res.status(500).send('Product decline failed');
    }
});



app.get('/api/transactions', async (req, res) => {
    try {
        const transactionsSnapshot = await db.collection('transactions').get();
        const transactions = [];

        for (const transactionDoc of transactionsSnapshot.docs) {
            const transactionData = transactionDoc.data();

            const buyerDoc = await db.collection('users').doc(transactionData.buyerID).get();
            const buyerName = buyerDoc.exists ? buyerDoc.data().name : 'לא זמין';

            const guarantors = transactionData.guarantees || [];
            const guarantorNames = [];

            for (const guarantor of guarantors) {
                const guarantorDoc = await db.collection('users').doc(guarantor.guarantorID).get();
                if (guarantorDoc.exists) {
                    guarantorNames.push(guarantorDoc.data().name);
                }
            }

            const sellerDoc = await db.collection('users').doc(transactionData.sellerID).get();
            const sellerName = sellerDoc.exists ? sellerDoc.data().name : 'לא זמין';

            transactions.push({
                buyerName: buyerName,
                guarantorName: guarantorNames.join(', ') || 'לא זמין',
                itemName: transactionData.itemName,
                guaranteePayment: transactionData.guaranteePayment,
                purchaseDate: transactionData.purchaseDate,
                sellerName: sellerName,
                guaranteesAmount: transactionData.guaranteesAmount,
                guarantees: transactionData.guarantees,
            });
        }

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});



function generateTempPassword() {
    const length = 8;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}


//dashboard


app.get('/api/getPendingEntities', async (req, res) => {
    try {
      const pendingUsersSnapshot = await db.collection('pendingUsers').get();
      const pendingStoresSnapshot = await db.collection('pendingStores').get();
      const pendingProductsSnapshot = await db.collection('pendingProducts').get();
  
      const pendingUsersCount = pendingUsersSnapshot.size;
      const pendingStoresCount = pendingStoresSnapshot.size;
      const pendingProductsCount = pendingProductsSnapshot.size;
  
      res.json({
        pendingUsers: pendingUsersCount,
        pendingStores: pendingStoresCount,
        pendingProducts: pendingProductsCount
      });
    } catch (error) {
      console.error('Error fetching pending entities:', error);
      res.status(500).json({ error: 'Failed to fetch pending entities' });
    }
  });
  
  
app.get('/api/getUsersByDate', async (req, res) => {
    try {
      const usersSnapshot = await db.collection('users').get();
      const usersByDate = {};
  
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
  
        if (userData.timestamp && userData.timestamp.seconds) {
          const date = new Date(userData.timestamp.seconds * 1000).toISOString().split('T')[0]; 
  
          if (!usersByDate[date]) {
            usersByDate[date] = 0;
          }
          usersByDate[date]++;
        } else {
          console.warn(`Document ${doc.id} is missing a valid timestamp`);
        }
      });
  
      res.json(usersByDate); 
    } catch (error) {
      console.error('Error fetching users by date:', error);
      res.status(500).send('Error fetching users');
    }
  });
  
  
app.get('/api/getUsersByGuarantees', async (req, res) => {
    try {
      const usersSnapshot = await db.collection('users').get();
      
      const combinedCategories = { '0': 0, '1': 0, '2-5': 0, '5-10': 0, '10+': 0 };
    
      usersSnapshot.forEach(doc => {
        const data = doc.data();
  
        const guaranteesLength = data.guaranteesProvided ? data.guaranteesProvided.length : 0;
        const itemsBoughtLength = data.itemsBought ? data.itemsBought.length : 0;
        const totalLength = guaranteesLength + itemsBoughtLength;
  
        if (totalLength === 0) combinedCategories['0']++;
        else if (totalLength === 1) combinedCategories['1']++;
        else if (totalLength >= 2 && totalLength <= 5) combinedCategories['2-5']++;
        else if (totalLength >= 5 && totalLength <= 10) combinedCategories['5-10']++;
        else combinedCategories['10+']++;
      });
    
      res.json(combinedCategories);
    } catch (error) {
      console.error('Error fetching users by combined guarantees and items bought:', error);
      res.status(500).send('Error fetching data');
    }
  });
  
  
  app.get('/api/getTransactionsCount', async (req, res) => {
    try {
      const transactionsSnapshot = await db.collection('transactions').get();
      const count = transactionsSnapshot.size; 
      res.json(count);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).send('Error fetching transactions');
    }
  });
  
  app.get('/api/getGuaranteeMilestones', async (req, res) => {
    try {
      const transactionsSnapshot = await db.collection('transactions').get();
      const milestones = { '0-50%': 0, '50-100%': 0, '100%': 0, '100%+': 0 };
  
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        const guaranteesLength = transaction.guarantees.length;
        const guaranteesAmount = transaction.guaranteesAmount;
  
        const percentage = (guaranteesLength / guaranteesAmount) * 100;
  
        if (percentage < 50) milestones['0-50%']++;
        else if (percentage >= 50 && percentage < 100) milestones['50-100%']++;
        else if (percentage === 100) milestones['100%']++;
        else if (percentage > 100) milestones['100%+']++;
      });
  
      res.json(milestones);
    } catch (error) {
      console.error('Error fetching guarantee milestones:', error);
      res.status(500).send('Error fetching milestones');
    }
  });
  
app.get('/api/getProductsByCategory', async (req, res) => {
    try {
      const productsSnapshot = await db.collection('products').get();
      const transactionsSnapshot = await db.collection('transactions').get();
      const categories = {};
      let totalProductsCount = 0; 
      const totalTransactionsCount = transactionsSnapshot.size; 
  
      productsSnapshot.forEach(doc => {
        totalProductsCount++;
      });
  
      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();
        if (!categories[product.category]) {
          categories[product.category] = { total: 0, inTransaction: 0 };
        }
        categories[product.category].total++;
  
        const productTransactions = transactionsSnapshot.docs.filter(doc => doc.data().itemID === productDoc.id);
        productTransactions.forEach(transactionDoc => {
          const transaction = transactionDoc.data();
          const productQuantity = transaction.quantity || 1;
  
          categories[product.category].inTransaction += productQuantity;
        });
      }
  
      for (const category in categories) {
        categories[category].totalPercent = (categories[category].total / totalProductsCount) * 100;
        categories[category].transactionPercent = (categories[category].inTransaction / totalTransactionsCount) * 100; 
      }
  
      res.json(categories); 
    } catch (error) {
      console.error('Error fetching products by category:', error);
      res.status(500).send('Error fetching products');
    }
  });

app.get('/api/topics', async (req, res) => {
    try {
        const topicsSnapshot = await db.collection('Topics').get();
        
        if (topicsSnapshot.empty) {
            return res.status(404).json({ error: 'No topics found' });
        }

        const topics = [];
        topicsSnapshot.forEach(doc => {
            topics.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(topics);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching topics' });
    }
});


app.post('/api/topics', async (req, res) => {
    try {
        const newTopicData = {
            "Discount by People": parseFloat(req.body["Discount by People"]),
            "Discount by Time": parseFloat(req.body["Discount by Time"]),
            "Guarantee for Activation": parseInt(req.body["Guarantee for Activation"]),
            "Guarantees": parseInt(req.body["Guarantees"]),
            "Hours": parseInt(req.body["Hours"]),
            "Hours for Activation": parseInt(req.body["Hours for Activation"]),
            name: {
                en: req.body.name.en,
                he: req.body.name.he
            }
        };
        
        const docRef = await db.collection('Topics').add(newTopicData); 
        res.status(201).json({ id: docRef.id, ...newTopicData });
    } catch (error) {
        res.status(500).json({ error: 'Error adding new topic' });
    }
});


app.put('/api/topics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTopic = req.body;
        await db.collection('Topics').doc(id).set(updatedTopic, { merge: true });
        res.status(200).json({ id, ...updatedTopic });
    } catch (error) {
        res.status(500).json({ error: 'Error updating topic' });
    }
});


app.delete('/api/topics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('Topics').doc(id).delete();
        res.status(200).json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error("Error deleting topic:", error);
        res.status(500).json({ error: 'Error deleting topic' });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
