const app = {
    config: {
        services: [
            { id: 1, name: "Corte Clásico", price: 5.00 },
            { id: 2, name: "Corte Urbano", price: 7.00 },
            { id: 3, name: "Perfilado de Barba", price: 3.00 },
            { id: 4, name: "Corte + Barba", price: 9.00 },
            { id: 5, name: "Tratamiento Capilar", price: 12.00 },
            { id: 6, name: "Tratamiento Facial", price: 8.00 }
        ],
        workingHours: {
            start: 8, 
            end: 20   
        },
        appointmentMargin: 30 
    },

    data: {
        db: { 
            appointments: [], 
            cash: 0.00,
            services: []
        },
        
        init() {
            const saved = localStorage.getItem('barberia_db_v2');
            if (saved) {
                try {
                    this.db = JSON.parse(saved);
                    // Migrar servicios si no existen
                    if (!this.db.services || this.db.services.length === 0) {
                        this.db.services = [...app.config.services];
                        this.save();
                    }
                    console.log('✅ Datos cargados desde LocalStorage');
                } catch (e) {
                    console.error('❌ Error cargando datos:', e);
                    this.resetToDefaults();
                }
            } else {
                console.log('ℹ️ Primera ejecución - Inicializando datos por defecto');
                this.resetToDefaults();
            }
        },
        
        resetToDefaults() {
            this.db = { 
                appointments: [], 
                cash: 0.00,
                services: [...app.config.services]
            };
            this.save();
        },
        
        save() {
            try {
                localStorage.setItem('barberia_db_v2', JSON.stringify(this.db));
                // Actualizar dashboard si está activo
                if (document.getElementById('view-admin')?.classList.contains('active-view')) {
                    app.admin.renderDashboard();
                }
                console.log('💾 Datos guardados correctamente');
            } catch (e) {
                console.error('❌ Error guardando datos:', e);
                alert('⚠️ Error al guardar. Verifica el espacio de almacenamiento del navegador.');
            }
        },

        reset() {
            if(confirm("⚠️ ¿Borrar TODAS las citas y resetear la caja?\n\nEsta acción no se puede deshacer.")) {
                this.resetToDefaults();
                alert('✅ Base de datos reiniciada correctamente');
                location.reload();
            }
        },

        addAppointment(apt) {
            apt.id = Date.now();
            apt.status = 'pending';
            apt.createdAt = new Date().toISOString();
            this.db.appointments.push(apt);
            this.save();
            return apt;
        },

        updateAppointment(id, updates) {
            const index = this.db.appointments.findIndex(a => a.id === id);
            if (index !== -1) {
                this.db.appointments[index] = { 
                    ...this.db.appointments[index], 
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                this.save();
                return true;
            }
            return false;
        },

        deleteAppointment(id) {
            const apt = this.db.appointments.find(a => a.id === id);
            if (apt && apt.status === 'paid') {
                if (!confirm('⚠️ Esta cita ya fue cobrada.\n\n¿Seguro deseas eliminarla?\n\nNOTA: Esto NO restará el dinero de la caja.')) {
                    return false;
                }
            }
            this.db.appointments = this.db.appointments.filter(a => a.id !== id);
            this.save();
            return true;
        },

        getServices() {
            return this.db.services.length > 0 ? this.db.services : app.config.services;
        },

        addService(service) {
            const maxId = this.db.services.length > 0 
                ? Math.max(...this.db.services.map(s => s.id)) 
                : 0;
            service.id = maxId + 1;
            this.db.services.push(service);
            this.save();
            app.booking.init();
            return service;
        },

        updateService(id, updates) {
            const index = this.db.services.findIndex(s => s.id === id);
            if (index !== -1) {
                this.db.services[index] = { ...this.db.services[index], ...updates };
                this.save();
                app.booking.init();
                return true;
            }
            return false;
        },

        deleteService(id) {
            if (this.db.services.length <= 1) {
                alert('⚠️ Debe haber al menos un servicio disponible');
                return false;
            }
            this.db.services = this.db.services.filter(s => s.id !== id);
            this.save();
            app.booking.init();
            return true;
        }
    },

    views: {
        show(viewId) {
            // Ocultar todas las vistas
            document.querySelectorAll('.section-view').forEach(el => 
                el.classList.remove('active-view')
            );
            
            // Mostrar vista seleccionada
            const targetView = document.getElementById(`view-${viewId}`);
            if (targetView) {
                targetView.classList.add('active-view');
                
                // Renderizar según la vista
                if (viewId === 'admin') {
                    app.admin.renderDashboard();
                } else if (viewId === 'services') {
                    app.services.render();
                }
                
                console.log(`📄 Vista activa: ${viewId}`);
            }
        }
    },

    auth: {
        PASSWORD: '1234', // ⚠️ En producción usar bcrypt o similar

        login() {
            const pass = document.getElementById('adminPass').value;
            if (pass === this.PASSWORD) {
                document.getElementById('adminPass').value = '';
                app.views.show('admin');
                console.log('✅ Sesión admin iniciada');
            } else {
                alert('❌ Contraseña incorrecta');
                document.getElementById('adminPass').focus();
            }
        },
        
        logout() {
            if (confirm('¿Cerrar sesión de administrador?')) {
                app.views.show('home');
                console.log('🚪 Sesión admin cerrada');
            }
        }
    },

    booking: {
        init() {
            const select = document.getElementById('serviceSelect');
            const services = app.data.getServices();
            
            select.innerHTML = services.map(s => 
                `<option value="${s.id}" data-price="${s.price}">
                    ${s.name} - $${s.price.toFixed(2)}
                </option>`
            ).join('');
            
            this.updatePrice();
            this.setMinDateTime();
        },

        setMinDateTime() {
            const input = document.getElementById('appDate');
            const now = new Date();
            // Ajustar timezone
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            input.min = now.toISOString().slice(0, 16);
        },

        updatePrice() {
            const select = document.getElementById('serviceSelect');
            const price = select.options[select.selectedIndex].getAttribute('data-price');
            document.getElementById('priceDisplay').innerText = `$${parseFloat(price).toFixed(2)}`;
        },

        validateDateTime(datetime) {
            const selected = new Date(datetime);
            const now = new Date();

            if (selected < now) {
                alert('⚠️ No puedes agendar citas en el pasado');
                return false;
            }

            const hour = selected.getHours();
            if (hour < app.config.workingHours.start || hour >= app.config.workingHours.end) {
                alert(`⚠️ Horario de atención: ${app.config.workingHours.start}:00 AM - ${app.config.workingHours.end}:00 PM`);
                return false;
            }

            const conflict = app.data.db.appointments.find(apt => {
                if (apt.status !== 'pending') return false;
                const aptDate = new Date(apt.date);
                const diffMinutes = Math.abs((aptDate - selected) / 60000);
                return diffMinutes < app.config.appointmentMargin;
            });

            if (conflict) {
                const conflictTime = new Date(conflict.date).toLocaleTimeString('es-EC', {
                    hour: '2-digit', 
                    minute: '2-digit'
                });
                alert(`⚠️ Horario no disponible.\n\nYa existe una cita a las ${conflictTime}.\n\nPor favor selecciona otro horario (margen: ${app.config.appointmentMargin} minutos).`);
                return false;
            }

            return true;
        },

        submit(e) {
            e.preventDefault();
            
            const name = document.getElementById('clientName').value.trim();
            const date = document.getElementById('appDate').value;
            const select = document.getElementById('serviceSelect');
            const serviceId = parseInt(select.value);
            const serviceName = select.options[select.selectedIndex].text.split(' - ')[0];
            const price = parseFloat(select.options[select.selectedIndex].getAttribute('data-price'));

            if (!name || name.length < 3) {
                alert('⚠️ Por favor ingresa un nombre válido (mínimo 3 caracteres)');
                document.getElementById('clientName').focus();
                return;
            }

            if (!date) {
                alert('⚠️ Por favor selecciona fecha y hora');
                document.getElementById('appDate').focus();
                return;
            }

            if (!this.validateDateTime(date)) {
                return;
            }

            const newApp = {
                client: name,
                service: serviceName,
                serviceId: serviceId,
                price: price,
                date: date
            };

            app.data.addAppointment(newApp);
            
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('es-EC', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const timeStr = dateObj.toLocaleTimeString('es-EC', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            alert(
                `✅ ¡Reserva Exitosa!\n\n` +
                `👤 Cliente: ${name}\n` +
                `✂️ Servicio: ${serviceName}\n` +
                `📅 Fecha: ${dateStr}\n` +
                `🕐 Hora: ${timeStr}\n` +
                `💰 Precio: $${price.toFixed(2)}\n\n` +
                `¡Te esperamos en Barbería Jahaziel!`
            );
            
            // Limpiar formulario
            document.getElementById('clientName').value = '';
            document.getElementById('appDate').value = '';
            this.updatePrice();
            this.setMinDateTime();
            
            console.log('✅ Cita creada:', newApp);
        }
    },

    admin: {
        renderDashboard() {
            this.updateStats();
            this.renderTable();
        },

        updateStats() {
            document.getElementById('totalCash').innerText = `$${app.data.db.cash.toFixed(2)}`;
            
            const pending = app.data.db.appointments.filter(a => a.status === 'pending').length;
            document.getElementById('pendingCount').innerText = pending;
            
            console.log(`📊 Stats: Caja=$${app.data.db.cash.toFixed(2)}, Pendientes=${pending}`);
        },

        renderTable() {
            const tbody = document.getElementById('appointmentsTable');
            
            if (app.data.db.appointments.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-5">
                            <i class="bi bi-inbox display-1 d-block mb-3 opacity-25"></i>
                            <h5>No hay citas registradas</h5>
                            <p class="small">Las citas aparecerán aquí cuando los clientes reserven</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Ordenar por fecha (más próximas primero)
            const sortedApps = [...app.data.db.appointments].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );

            tbody.innerHTML = sortedApps.map(appItem => {
                const dateObj = new Date(appItem.date);
                const now = new Date();
                const isPast = dateObj < now;
                
                const timeStr = dateObj.toLocaleTimeString('es-EC', {
                    hour: '2-digit', 
                    minute: '2-digit'
                });
                const dateStr = dateObj.toLocaleDateString('es-EC', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });

                let statusBadge, actionButtons;

                if (appItem.status === 'paid') {
                    statusBadge = '<span class="badge bg-success status-badge"><i class="bi bi-check-circle me-1"></i>Pagado</span>';
                    actionButtons = `
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="app.admin.deleteAppointment(${appItem.id})"
                                title="Eliminar registro">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                } else {
                    const warningClass = isPast ? 'bg-danger' : 'bg-warning text-dark';
                    const warningIcon = isPast ? '<i class="bi bi-exclamation-triangle me-1"></i>' : '';
                    statusBadge = `<span class="badge ${warningClass} status-badge">${warningIcon}Pendiente</span>`;
                    actionButtons = `
                        <button class="btn btn-sm btn-success me-1" 
                                onclick="app.admin.processPayment(${appItem.id})"
                                title="Marcar como pagado">
                            <i class="bi bi-cash-coin"></i> Cobrar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="app.admin.deleteAppointment(${appItem.id})"
                                title="Eliminar cita">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                }

                const rowClass = isPast && appItem.status === 'pending' ? 'table-warning' : '';

                return `
                    <tr class="${rowClass}">
                        <td>
                            <small class="text-muted d-block">${dateStr}</small>
                            <strong>${timeStr}</strong>
                        </td>
                        <td><strong>${appItem.client}</strong></td>
                        <td>${appItem.service}</td>
                        <td><span class="badge bg-dark">$${appItem.price.toFixed(2)}</span></td>
                        <td>${statusBadge}</td>
                        <td class="text-nowrap">${actionButtons}</td>
                    </tr>
                `;
            }).join('');
        },

        processPayment(id) {
            const apt = app.data.db.appointments.find(a => a.id === id);
            if (!apt) {
                alert('⚠️ Error: Cita no encontrada');
                return;
            }

            const confirmMsg = 
                `💰 Confirmar cobro:\n\n` +
                `👤 Cliente: ${apt.client}\n` +
                `✂️ Servicio: ${apt.service}\n` +
                `💵 Monto: $${apt.price.toFixed(2)}\n\n` +
                `¿Proceder con el pago?`;

            if (confirm(confirmMsg)) {
                app.data.updateAppointment(id, { status: 'paid' });
                app.data.db.cash += apt.price;
                app.data.save();
                console.log(`💰 Pago procesado: +$${apt.price.toFixed(2)}`);
            }
        },

        deleteAppointment(id) {
            const apt = app.data.db.appointments.find(a => a.id === id);
            if (!apt) {
                alert('⚠️ Error: Cita no encontrada');
                return;
            }

            const confirmMsg = apt.status === 'paid' 
                ? `⚠️ ¿Eliminar cita PAGADA?\n\n` +
                  `👤 Cliente: ${apt.client}\n` +
                  `💵 Monto: $${apt.price.toFixed(2)}\n\n` +
                  `⚠️ ADVERTENCIA: Esto NO restará el dinero de la caja.`
                : `¿Eliminar cita?\n\n` +
                  `👤 Cliente: ${apt.client}\n` +
                  `✂️ Servicio: ${apt.service}`;

            if (confirm(confirmMsg)) {
                app.data.deleteAppointment(id);
                console.log(`🗑️ Cita eliminada: ${apt.client}`);
            }
        }
    },

    services: {
        render() {
            const container = document.getElementById('servicesTable');
            const services = app.data.getServices();

            if (services.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted py-5">
                        <i class="bi bi-inbox display-1 d-block mb-3 opacity-25"></i>
                        <h5>No hay servicios disponibles</h5>
                        <p>Agrega tu primer servicio usando el botón "Nuevo Servicio"</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = services.map(s => `
                <div class="card card-custom mb-3 shadow-sm">
                    <div class="card-body d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">
                                <i class="bi bi-scissors text-warning"></i> ${s.name}
                            </h5>
                            <span class="badge bg-success">$${s.price.toFixed(2)}</span>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="app.services.edit(${s.id})"
                                    title="Editar servicio">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="app.services.delete(${s.id})"
                                    title="Eliminar servicio">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        },

        add() {
            const name = prompt('Nombre del nuevo servicio:\n(Ej. Corte Premium, Afeitado)');
            if (!name || name.trim().length < 3) {
                alert('⚠️ El nombre debe tener al menos 3 caracteres');
                return;
            }

            const priceStr = prompt('Precio del servicio en USD:\n(Ej. 5.00, 12.50)');
            const price = parseFloat(priceStr);
            
            if (isNaN(price) || price <= 0) {
                alert('⚠️ El precio debe ser un número positivo');
                return;
            }

            app.data.addService({ 
                name: name.trim(), 
                price: parseFloat(price.toFixed(2))
            });
            
            this.render();
            alert(`✅ Servicio "${name.trim()}" agregado correctamente`);
            console.log(`➕ Servicio agregado: ${name.trim()} - $${price.toFixed(2)}`);
        },

        edit(id) {
            const service = app.data.db.services.find(s => s.id === id);
            if (!service) {
                alert('⚠️ Error: Servicio no encontrado');
                return;
            }

            const newName = prompt('Nuevo nombre del servicio:', service.name);
            if (!newName || newName.trim().length < 3) {
                return; // Usuario canceló o nombre inválido
            }

            const newPriceStr = prompt('Nuevo precio (USD):', service.price.toFixed(2));
            const newPrice = parseFloat(newPriceStr);
            
            if (isNaN(newPrice) || newPrice <= 0) {
                alert('⚠️ El precio debe ser un número positivo');
                return;
            }

            app.data.updateService(id, { 
                name: newName.trim(), 
                price: parseFloat(newPrice.toFixed(2))
            });
            
            this.render();
            alert(`✅ Servicio actualizado correctamente`);
            console.log(`✏️ Servicio editado: ${newName.trim()} - $${newPrice.toFixed(2)}`);
        },

        delete(id) {
            const service = app.data.db.services.find(s => s.id === id);
            if (!service) {
                alert('⚠️ Error: Servicio no encontrado');
                return;
            }

            if (confirm(`¿Eliminar el servicio "${service.name}"?\n\nEsta acción no se puede deshacer.`)) {
                if (app.data.deleteService(id)) {
                    this.render();
                    alert(`✅ Servicio "${service.name}" eliminado`);
                    console.log(`🗑️ Servicio eliminado: ${service.name}`);
                }
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 Iniciando Sistema Barbería Jahaziel v2.0');
    console.log('═══════════════════════════════════════════════════════════');
    
    app.data.init();
    app.booking.init();
    
    console.log('✅ Sistema cargado correctamente');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Citas registradas: ${app.data.db.appointments.length}`);
    console.log(`   - Caja actual: $${app.data.db.cash.toFixed(2)}`);
    console.log(`   - Servicios disponibles: ${app.data.db.services.length}`);
    console.log('═══════════════════════════════════════════════════════════');
});
