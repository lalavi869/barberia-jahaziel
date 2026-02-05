/**
 * SISTEMA BARBERÍA JAHAZIEL
 * Módulos: Data, Auth, Views, Booking
 */

const app = {
    // 1. Configuración y Datos Iniciales
    config: {
        services: [
            { id: 1, name: "Corte Clásico", price: 5.00 },
            { id: 2, name: "Barba y Corte", price: 8.00 },
            { id: 3, name: "Corte Urbano", price: 6.00 },
            { id: 4, name: "Tratamiento Facial", price: 4.00 }
        ]
    },

    // 2. Módulo de Datos (Persistencia)
    data: {
        db: { appointments: [], cash: 0.00 },
        
        init() {
            const saved = localStorage.getItem('barberia_db_v2');
            if (saved) {
                this.db = JSON.parse(saved);
            }
        },
        
        save() {
            localStorage.setItem('barberia_db_v2', JSON.stringify(this.db));
            app.admin.renderDashboard();
        },

        reset() {
            if(confirm("¿Borrar todos los datos?")) {
                this.db = { appointments: [], cash: 0.00 };
                this.save();
                location.reload();
            }
        }
    },

    // 3. Módulo de Vistas
    views: {
        show(viewId) {
            document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active-view'));
            document.getElementById(`view-${viewId}`).classList.add('active-view');
        }
    },

    // 4. Módulo de Autenticación
    auth: {
        login() {
            const pass = document.getElementById('adminPass').value;
            if (pass === '1234') {
                document.getElementById('adminPass').value = '';
                app.views.show('admin');
                app.admin.renderDashboard();
            } else {
                alert('Contraseña incorrecta');
            }
        },
        logout() {
            app.views.show('home');
        }
    },

    // 5. Módulo de Reservas (Cliente)
    booking: {
        init() {
            const select = document.getElementById('serviceSelect');
            select.innerHTML = '';
            app.config.services.forEach(s => {
                select.innerHTML += `<option value="${s.id}" data-price="${s.price}">${s.name}</option>`;
            });
            this.updatePrice();
        },

        updatePrice() {
            const select = document.getElementById('serviceSelect');
            const price = select.options[select.selectedIndex].getAttribute('data-price');
            document.getElementById('priceDisplay').innerText = `$${parseFloat(price).toFixed(2)}`;
        },

        submit(e) {
            e.preventDefault();
            const name = document.getElementById('clientName').value;
            const date = document.getElementById('appDate').value;
            const select = document.getElementById('serviceSelect');
            const serviceName = select.options[select.selectedIndex].text;
            const price = parseFloat(select.options[select.selectedIndex].getAttribute('data-price'));

            const newApp = {
                id: Date.now(),
                client: name,
                service: serviceName,
                price: price,
                date: date,
                status: 'pending'
            };

            app.data.db.appointments.push(newApp);
            app.data.save();
            
            alert(`✅ Turno reservado para ${name}`);
            document.getElementById('clientName').value = '';
        }
    },

    // 6. Módulo de Administración (Dueño)
    admin: {
        renderDashboard() {
            // Actualizar Caja
            document.getElementById('totalCash').innerText = `$${app.data.db.cash.toFixed(2)}`;
            
            // Contar Pendientes
            const pending = app.data.db.appointments.filter(a => a.status === 'pending').length;
            document.getElementById('pendingCount').innerText = pending;

            // Renderizar Tabla
            const tbody = document.getElementById('appointmentsTable');
            tbody.innerHTML = '';
            
            // Ordenar por fecha
            const sortedApps = [...app.data.db.appointments].sort((a, b) => new Date(a.date) - new Date(b.date));

            sortedApps.forEach(appItem => {
                const dateObj = new Date(appItem.date);
                const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const dateStr = dateObj.toLocaleDateString();

                let statusBadge, actionBtn;

                if (appItem.status === 'paid') {
                    statusBadge = '<span class="badge bg-success status-badge">Pagado</span>';
                    actionBtn = '<button class="btn btn-sm btn-secondary" disabled>Cerrado</button>';
                } else {
                    statusBadge = '<span class="badge bg-warning text-dark status-badge">Pendiente</span>';
                    actionBtn = `<button class="btn btn-sm btn-success" onclick="app.admin.processPayment(${appItem.id})">Cobrar</button>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td>${dateStr} ${timeStr}</td>
                        <td><strong>${appItem.client}</strong></td>
                        <td>${appItem.service}</td>
                        <td>$${appItem.price.toFixed(2)}</td>
                        <td>${statusBadge}</td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            });
        },

        processPayment(id) {
            const index = app.data.db.appointments.findIndex(a => a.id === id);
            if (index !== -1) {
                app.data.db.appointments[index].status = 'paid';
                app.data.db.cash += app.data.db.appointments[index].price;
                app.data.save();
            }
        }
    }
};

// Inicializar la aplicación cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    app.data.init();
    app.booking.init();
});