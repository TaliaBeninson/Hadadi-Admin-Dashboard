function goToApproval() {
    location.href = '/approval';
  }

  fetch('/api/getPendingEntities')
    .then(response => response.json())
    .then(data => {
      const ctx = document.getElementById('pendingEntitiesChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['משתמשים ממתינים', 'חנויות ממתינות', 'מוצרים ממתינים'],
          datasets: [{
            label: 'כמות ממתינה',
            data: [data.pendingUsers, data.pendingStores, data.pendingProducts],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }]
        },
        options: {
          onClick: goToApproval,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    });

  fetch('/api/getUsersByDate')
    .then(response => response.json())
    .then(data => {
      const ctx = document.getElementById('newUsersChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: Object.keys(data), 
          datasets: [{
            label: 'משתמשים חדשים',
            data: Object.values(data), 
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            fill: true
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    });

  fetch('/api/getUsersByGuarantees')
    .then(response => response.json())
    .then(data => {
      console.log(data)
      const ctx = document.getElementById('usersPlayingChart').getContext('2d');
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['0 תנועות', '1 תנועה', '2-5 תנועות', '5-10 תנועות', '10+ תנועות'],
          datasets: [{
            label: 'משתמשים המשתתפים במשחק',
            data: Object.values(data), 
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        }
      });
    });

  fetch('/api/getTransactionsCount')
    .then(response => response.json())
    .then(data => {
      document.getElementById('transactionsCount').innerText = `סהכ נפתחו ${data} בקשות לערבות`;
    });

  fetch('/api/getGuaranteeMilestones')
    .then(response => response.json())
    .then(data => {
      const ctx = document.getElementById('guaranteesMilestonesChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['0-50%', '50-100%', '100%', '100%+'],
          datasets: [{
            label: 'כמות ערבים באחוזים',
            data: Object.values(data),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    });

  fetch('/api/getProductsByCategory')
    .then(response => response.json())
    .then(data => {
      const categories = Object.keys(data);
      const totalProductsPercent = categories.map(category => data[category].totalPercent);
      const productsInTransactionPercent = categories.map(category => data[category].transactionPercent);

      const totalCtx = document.getElementById('totalProductsByCategoryChart').getContext('2d');
      new Chart(totalCtx, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [{
            label: 'סך המוצרים (%)',
            data: totalProductsPercent,
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return value + '%'; 
                }
              }
            }
          }
        }
      });

      const transactionCtx = document.getElementById('productsInTransactionByCategoryChart').getContext('2d');
      new Chart(transactionCtx, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [{
            label: 'מוצרים בעסקה (%)',
            data: productsInTransactionPercent,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y', 
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return value + '%'; 
                }
              }
            }
          }
        }
      });
    });
