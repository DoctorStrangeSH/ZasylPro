class App {
    constructor() {
        this.processor = new DataProcessor();
        this.tableRenderer = null;
        this.uploadedFiles = {
            orders: null,
            zasyls: null,
            shifts: null
        };
        this.processedResult = null;
        this.init();
    }

    init() {
        console.log('🔧 Инициализация приложения...');
        
        // Инициализируем TableRenderer
        try {
            this.tableRenderer = new TableRenderer();
            console.log('✅ TableRenderer инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации TableRenderer:', error);
        }
        
        this.setupDragAndDrop();
        this.setupFileInputs();
        this.setupButtons();
        this.setupSidebar();
        this.setupScrollToTop();
        this.hidePreloader();
        
        console.log('✅ Приложение готово к работе');
    }

    hidePreloader() {
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            if (preloader) {
                preloader.classList.add('hidden');
                setTimeout(() => {
                    if (preloader) {
                        preloader.style.display = 'none';
                    }
                }, 500);
            }
        }, 500);
    }

    setupDragAndDrop() {
        const dropZones = [
            { id: 'ordersUploadCard', type: 'orders' },
            { id: 'zasylsUploadCard', type: 'zasyls' },
            { id: 'shiftsUploadCard', type: 'shifts' }
        ];

        dropZones.forEach(zone => {
            const element = document.getElementById(zone.id);
            if (!element) {
                console.warn(`Элемент ${zone.id} не найден`);
                return;
            }

            // Предотвращаем поведение по умолчанию для drag & drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                element.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            // Подсветка при наведении
            ['dragenter', 'dragover'].forEach(eventName => {
                element.addEventListener(eventName, () => {
                    element.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                element.addEventListener(eventName, () => {
                    element.classList.remove('drag-over');
                });
            });

            // Обработка dropped файла
            element.addEventListener('drop', (e) => {
                const file = e.dataTransfer.files[0];
                if (file) {
                    console.log(`📁 Файл перетащен в ${zone.type}:`, file.name);
                    this.handleFile(file, zone.type);
                }
            });

            // Клик по карточке открывает выбор файла
            element.addEventListener('click', (e) => {
                if (e.target.closest('.upload-btn') || e.target.closest('button')) {
                    return;
                }
                
                const fileInput = document.getElementById(`${zone.type}FileInput`);
                if (fileInput) {
                    fileInput.click();
                }
            });
        });

        console.log('✅ Drag & Drop настроен');
    }

    setupFileInputs() {
        const fileInputs = [
            { id: 'ordersFileInput', type: 'orders' },
            { id: 'zasylsFileInput', type: 'zasyls' },
            { id: 'shiftsFileInput', type: 'shifts' }
        ];

        fileInputs.forEach(input => {
            const element = document.getElementById(input.id);
            if (!element) {
                console.warn(`Input ${input.id} не найден`);
                return;
            }

            element.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    console.log(`📁 Файл выбран для ${input.type}:`, file.name);
                    this.handleFile(file, input.type);
                }
            });
        });

        console.log('✅ File inputs настроены');
    }

    handleFile(file, type) {
        if (!file) return;

        console.log(`📎 Обработка файла: ${file.name} (тип: ${type})`);

        // Проверяем расширение
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const fileName = file.name.toLowerCase();
        const hasAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

        if (!hasAllowedExtension) {
            Swal.fire({
                icon: 'error',
                title: 'Неверный формат файла',
                text: `Поддерживаются только файлы: ${allowedExtensions.join(', ')}`,
                confirmButtonText: 'Понятно'
            });
            return;
        }

        // Сохраняем файл
        this.uploadedFiles[type] = file;
        console.log(`✅ Файл сохранен: ${type}`, file.name);

        // Обновляем UI
        this.updateFileUI(type, file);

        // Проверяем, можно ли активировать кнопку обработки
        this.checkAllFilesLoaded();

        // Показываем уведомление
        this.showToast(`Файл "${file.name}" загружен`, 'success');
    }

    updateFileUI(type, file) {
        // Показываем бейдж
        const badge = document.getElementById(`${type}Badge`);
        if (badge) {
            badge.style.display = 'flex';
        }

        // Показываем имя файла
        const fileInfo = document.getElementById(`${type}FileInfo`);
        const fileNameElement = document.getElementById(`${type}FileName`);
        if (fileInfo && fileNameElement) {
            fileInfo.style.display = 'flex';
            fileNameElement.textContent = file.name;
        }

        // Добавляем класс загруженной карточки
        const card = document.getElementById(`${type}UploadCard`);
        if (card) {
            card.classList.add('file-loaded');
        }

        console.log(`✅ UI обновлен для ${type}`);
    }

    checkAllFilesLoaded() {
        const processBtn = document.getElementById('processBtn');
        if (!processBtn) {
            console.warn('Кнопка processBtn не найдена');
            return;
        }

        // Для обработки нужны минимум заказы и засылы
        if (this.uploadedFiles.orders && this.uploadedFiles.zasyls) {
            processBtn.disabled = false;
            processBtn.title = 'Нажмите для обработки';
            processBtn.classList.add('pulse-animation');
            console.log('✅ Кнопка "Обработать данные" активирована');
        } else {
            processBtn.disabled = true;
            processBtn.title = 'Загрузите файлы заказов и засылов';
            processBtn.classList.remove('pulse-animation');
            
            const missing = [];
            if (!this.uploadedFiles.orders) missing.push('Заказы (логи)');
            if (!this.uploadedFiles.zasyls) missing.push('Засылы');
            
            console.log(`⏳ Ожидание файлов: ${missing.join(', ')}`);
        }
    }

    setupButtons() {
        // Кнопка обработки
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => {
                console.log('🖱️ Кнопка "Обработать данные" нажата');
                this.processData();
            });
        }

        // Кнопка скачивания
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                console.log('🖱️ Кнопка "Скачать результат" нажата');
                this.downloadResult();
            });
        }

        // Кнопка экспорта таблицы
        const exportTableBtn = document.getElementById('exportTableBtn');
        if (exportTableBtn) {
            exportTableBtn.addEventListener('click', () => {
                console.log('🖱️ Кнопка "Экспорт таблицы" нажата');
                this.downloadResult();
            });
        }

        // Кнопка сброса таблицы
        const resetTableBtn = document.getElementById('resetTableBtn');
        if (resetTableBtn) {
            resetTableBtn.addEventListener('click', () => {
                console.log('🖱️ Сброс таблицы');
                if (this.tableRenderer) {
                    this.tableRenderer.clearTable();
                }
            });
        }

        // Кнопка обновления таблицы
        const refreshTableBtn = document.getElementById('refreshTableBtn');
        if (refreshTableBtn) {
            refreshTableBtn.addEventListener('click', () => {
                console.log('🖱️ Обновление таблицы');
                if (this.processedResult) {
                    this.displayResults(this.processedResult);
                }
            });
        }

        // Кнопки фильтров
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                console.log('🖱️ Применение фильтров');
                this.applyFilters();
            });
        }

        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                console.log('🖱️ Сброс фильтров');
                this.resetFilters();
            });
        }

        console.log('✅ Кнопки настроены');
    }

    setupSidebar() {
        const filterToggle = document.getElementById('filterToggle');
        const filterSidebar = document.getElementById('filterSidebar');
        const closeFilterSidebar = document.getElementById('closeFilterSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (filterToggle && filterSidebar) {
            filterToggle.addEventListener('click', () => {
                filterSidebar.classList.toggle('open');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.toggle('active');
                }
            });
        }

        if (closeFilterSidebar && filterSidebar) {
            closeFilterSidebar.addEventListener('click', () => {
                filterSidebar.classList.remove('open');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                }
            });
        }

        if (sidebarOverlay && filterSidebar) {
            sidebarOverlay.addEventListener('click', () => {
                filterSidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }

        console.log('✅ Боковая панель настроена');
    }

    setupScrollToTop() {
        const scrollBtn = document.getElementById('scrollToTop');
        if (!scrollBtn) return;

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        console.log('✅ Кнопка "Наверх" настроена');
    }

    async processData() {
        console.log('🚀 Начинаем обработку данных...');
        
        if (!this.uploadedFiles.orders || !this.uploadedFiles.zasyls) {
            Swal.fire({
                icon: 'warning',
                title: 'Недостаточно данных',
                text: 'Загрузите оба файла: с заказами (логами) и с засылами',
                confirmButtonText: 'Хорошо'
            });
            return;
        }

        // Показываем модальное окно обработки
        let processingModal;
        try {
            processingModal = new bootstrap.Modal(document.getElementById('processingModal'));
            processingModal.show();
        } catch (e) {
            console.warn('Не удалось показать модальное окно:', e);
        }

        // Обновляем шаги
        this.updateProcessingStep(1, 'Загрузка файлов...');

        try {
            await this.delay(500);
            this.updateProcessingStep(2, 'Анализ данных...');
            
            console.log('📊 Вызов processFiles...');
            const result = await this.processor.processFiles(
                this.uploadedFiles.orders,
                this.uploadedFiles.zasyls,
                this.uploadedFiles.shifts
            );

            await this.delay(500);
            this.updateProcessingStep(3, 'Формирование отчета...');

            if (result.success) {
                this.processedResult = result;
                console.log('✅ Обработка успешна, записей:', result.data.length);
                
                // Отображаем результаты
                this.displayResults(result);
                
                await this.delay(300);
                this.updateProcessingStep(4, 'Готово!');
                
                await this.delay(500);
                if (processingModal) {
                    processingModal.hide();
                }

                // Показываем кнопку скачивания
                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) {
                    downloadBtn.classList.remove('d-none');
                }

                // Показываем уведомление об успехе
                Swal.fire({
                    icon: 'success',
                    title: 'Обработка завершена!',
                    html: `
                        <div class="text-start">
                            <p><strong>📦 Всего записей:</strong> ${result.stats.total}</p>
                            <p><strong>✅ Засылов:</strong> ${result.stats.zasyls} (${result.stats.zasylsPercentage}%)</p>
                            <p><strong>❌ Не засылов:</strong> ${result.stats.noZasyls} (${result.stats.noZasylsPercentage}%)</p>
                            <p><strong>💰 Общая стоимость:</strong> ${result.stats.totalCost.toLocaleString('ru-RU')} ₽</p>
                            ${result.warnings.length > 0 ? 
                                `<p class="text-warning"><strong>⚠️ Предупреждений:</strong> ${result.warnings.length}</p>` 
                                : ''}
                        </div>
                    `,
                    confirmButtonText: 'Отлично!'
                });

                console.log('✅ Обработка завершена успешно');
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('❌ Ошибка обработки:', error);
            if (processingModal) {
                processingModal.hide();
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Ошибка обработки',
                text: error.message || 'Произошла ошибка при обработке данных',
                confirmButtonText: 'Понятно'
            });
        }
    }

    updateProcessingStep(stepNumber, message) {
        const steps = document.querySelectorAll('.processing-step');
        const statusElement = document.getElementById('processingStatus');
        
        if (statusElement) {
            statusElement.textContent = message;
        }

        steps.forEach(step => {
            const stepData = parseInt(step.getAttribute('data-step'));
            step.classList.remove('active', 'completed');
            
            if (stepData < stepNumber) {
                step.classList.add('completed');
            } else if (stepData === stepNumber) {
                step.classList.add('active');
            }
        });
        
        console.log(`📊 Шаг ${stepNumber}: ${message}`);
    }

    displayResults(result) {
        console.log('📊 Отображение результатов...');
        
        // Обновляем статистику
        this.updateStatistics(result.stats);
        
        // Обновляем таблицу
        if (this.tableRenderer) {
            console.log('📊 Вызов tableRenderer.updateTable с', result.data.length, 'записями');
            this.tableRenderer.updateTable(result.data);
        } else {
            console.error('❌ TableRenderer не инициализирован!');
            // Пробуем инициализировать заново
            try {
                this.tableRenderer = new TableRenderer();
                this.tableRenderer.updateTable(result.data);
            } catch (e) {
                console.error('Не удалось инициализировать TableRenderer:', e);
            }
        }
        
        // Обновляем фильтры
        this.updateFilters(result.data);
        
        // Обновляем графики
        if (window.chartManager) {
            try {
                window.chartManager.updateCharts(result.stats);
            } catch (e) {
                console.warn('Не удалось обновить графики:', e);
            }
        }
        
        // Обновляем время последнего обновления
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            lastUpdate.textContent = new Date().toLocaleString('ru-RU');
        }
        
        console.log('✅ Результаты отображены');
    }

    updateStatistics(stats) {
        console.log('📈 Обновление статистики:', stats);
        
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        setValue('totalOrders', stats.total || 0);
        setValue('totalZasyls', stats.zasyls || 0);
        setValue('totalNoZasyls', stats.noZasyls || 0);
        setValue('totalCost', (stats.totalCost || 0).toLocaleString('ru-RU') + ' ₽');
        
        const zasylsPercentage = document.getElementById('zasylsPercentage');
        if (zasylsPercentage) zasylsPercentage.textContent = (stats.zasylsPercentage || '0') + '%';
        
        const noZasylsPercentage = document.getElementById('noZasylsPercentage');
        if (noZasylsPercentage) noZasylsPercentage.textContent = (stats.noZasylsPercentage || '0') + '%';
        
        const avgCost = document.getElementById('avgCost');
        if (avgCost) avgCost.textContent = (stats.avgCost || 0).toLocaleString('ru-RU') + ' ₽';
    }

    updateFilters(data) {
        // Обновляем select с сортировочными центрами
        const scFilter = $('#scFilter');
        if (scFilter.length) {
            scFilter.empty();
            scFilter.append('<option value="">Все СЦ</option>');
            
            const zones = [...new Set(data.map(r => r['Зона сортировки']).filter(v => v && v !== '-'))];
            zones.sort();
            zones.forEach(zone => {
                scFilter.append(`<option value="${zone}">${zone}</option>`);
            });
        }
        
        // Обновляем select с компаниями
        const companyFilter = $('#companyFilter');
        if (companyFilter.length) {
            companyFilter.empty();
            companyFilter.append('<option value="">Все компании</option>');
            
            const companies = [...new Set(data.map(r => r['Компания']).filter(v => v && v !== '-'))];
            companies.sort();
            companies.forEach(company => {
                companyFilter.append(`<option value="${company}">${company}</option>`);
            });
        }
        
        // Переинициализируем Select2
        try {
            $('.select2').trigger('change');
        } catch (e) {
            console.warn('Не удалось обновить Select2:', e);
        }
    }

    applyFilters() {
        console.log('🔍 Применение фильтров');
        
        if (!this.processedResult) {
            this.showToast('Нет данных для фильтрации', 'warning');
            return;
        }
        
        const filters = {
            dateFrom: document.getElementById('dateFrom')?.value,
            dateTo: document.getElementById('dateTo')?.value,
            status: document.getElementById('statusFilter')?.value,
            orderSearch: document.getElementById('orderSearch')?.value,
            zasylshik: document.getElementById('zasylshikSearch')?.value
        };

        const filteredData = this.processor.filterData(filters);
        
        if (this.tableRenderer) {
            this.tableRenderer.updateTable(filteredData);
        }
        
        this.updateStatistics(this.processor.getStatistics(filteredData));
        
        // Закрываем сайдбар на мобильных
        if (window.innerWidth < 992) {
            const filterSidebar = document.getElementById('filterSidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            if (filterSidebar) filterSidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
        
        this.showToast(`Найдено ${filteredData.length} записей`, 'success');
    }

    resetFilters() {
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        const statusFilter = document.getElementById('statusFilter');
        const orderSearch = document.getElementById('orderSearch');
        const zasylshikSearch = document.getElementById('zasylshikSearch');
        
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        if (statusFilter) statusFilter.value = 'all';
        if (orderSearch) orderSearch.value = '';
        if (zasylshikSearch) zasylshikSearch.value = '';
        
        try {
            $('#scFilter').val('').trigger('change');
            $('#companyFilter').val('').trigger('change');
        } catch (e) {}
        
        if (this.processedResult && this.tableRenderer) {
            this.tableRenderer.updateTable(this.processedResult.data);
            this.updateStatistics(this.processedResult.stats);
        }
        
        this.showToast('Фильтры сброшены', 'info');
    }

    async downloadResult() {
        if (!this.processedResult) {
            Swal.fire({
                icon: 'warning',
                title: 'Нет данных',
                text: 'Сначала обработайте файлы'
            });
            return;
        }
        
        try {
            const wb = this.processor.generateExcelReport(
                this.processedResult.data,
                this.processedResult.stats
            );
            
            const filename = `zasyl_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            this.showToast(`Файл "${filename}" сохранен`, 'success');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            Swal.fire({
                icon: 'error',
                title: 'Ошибка',
                text: 'Не удалось создать файл'
            });
        }
    }

    showToast(message, type = 'info') {
        // Используем SweetAlert2 toast
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info',
            title: message
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Инициализация приложения при загрузке страницы
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM загружен, инициализация приложения...');
    
    try {
        app = new App();
        console.log('✅ Приложение успешно инициализировано');
        console.log('📊 TableRenderer:', app.tableRenderer ? 'готов' : 'НЕ готов');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
});

// Экспорт для использования в других скриптах
window.App = App;