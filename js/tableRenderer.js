class TableRenderer {
    constructor() {
        this.table = null;
        this.initializeDataTable();
    }

    // Инициализация DataTables
    initializeDataTable() {
        // Проверяем, что таблица существует
        if (!document.getElementById('mainTable')) {
            console.warn('Таблица #mainTable не найдена в DOM');
            return;
        }

        // Уничтожаем предыдущую инициализацию если была
        if ($.fn.DataTable.isDataTable('#mainTable')) {
            $('#mainTable').DataTable().destroy();
        }

        this.table = $('#mainTable').DataTable({
            language: {
                processing: "Обработка...",
                search: "Поиск:",
                lengthMenu: "Показать _MENU_ записей",
                info: "Записи с _START_ по _END_ из _TOTAL_",
                infoEmpty: "Записи с 0 по 0 из 0",
                infoFiltered: "(отфильтровано из _MAX_ записей)",
                loadingRecords: "Загрузка...",
                zeroRecords: "Записи отсутствуют",
                emptyTable: "В таблице отсутствуют данные",
                paginate: {
                    first: "Первая",
                    previous: "Предыдущая",
                    next: "Следующая",
                    last: "Последняя"
                }
            },
            pageLength: 50,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Все"]],
            responsive: true,
            scrollX: true,
            columns: [
                { data: 'Номер грузоместа', defaultContent: '-' },
                { data: 'Номер заказа', defaultContent: '-' },
                { 
                    data: 'Стоимость',
                    defaultContent: '0',
                    render: function(data) {
                        const num = parseFloat(data);
                        return isNaN(num) ? '0 ₽' : num.toLocaleString('ru-RU') + ' ₽';
                    }
                },
                { data: 'Кто отправил', defaultContent: '-' },
                { data: 'Куда должны были отправить', defaultContent: '-' },
                { data: 'Куда отправили засыл', defaultContent: '-' },
                { data: 'Номер смены', defaultContent: '-' },
                { data: 'Зона сортировки', defaultContent: '-' },
                { data: 'ФИО засыльщика', defaultContent: '-' },
                { data: 'Компания', defaultContent: '-' },
                { data: 'Дата засыла', defaultContent: '-' },
                { data: 'Почему не засыл?', defaultContent: '-' },
                { 
                    data: 'Статус',
                    defaultContent: 'Не засыл',
                    render: function(data) {
                        let badgeClass = 'badge-no-zasyl';
                        if (data === 'Засыл') badgeClass = 'badge-zasyl';
                        else if (data === 'Возврат') badgeClass = 'badge-warning';
                        
                        return `<span class="badge badge-status ${badgeClass}">${data || 'Не засыл'}</span>`;
                    }
                }
            ],
            createdRow: function(row, data) {
                if (data['Статус'] === 'Засыл') {
                    $(row).addClass('row-zasyl');
                } else if (data['Статус'] === 'Не засыл') {
                    $(row).addClass('row-no-zasyl');
                }
            }
        });

        console.log('✅ DataTables инициализирована');
    }

    // Обновление таблицы
    updateTable(data) {
        if (!this.table) {
            console.error('Таблица не инициализирована, переинициализируем...');
            this.initializeDataTable();
        }
        
        if (!this.table) {
            console.error('Не удалось инициализировать таблицу');
            return;
        }

        this.table.clear();
        
        if (data && data.length > 0) {
            this.table.rows.add(data);
            console.log(`📊 Добавлено ${data.length} записей в таблицу`);
        } else {
            console.warn('Нет данных для отображения');
        }
        
        this.table.draw();
        
        // Обновление счетчика записей
        const recordsCount = document.getElementById('recordsCount');
        if (recordsCount) {
            recordsCount.textContent = data ? data.length : 0;
        }
    }

    // Очистка таблицы
    clearTable() {
        if (this.table) {
            this.table.clear().draw();
        }
        const recordsCount = document.getElementById('recordsCount');
        if (recordsCount) {
            recordsCount.textContent = '0';
        }
    }

    // Получение текущих данных таблицы
    getCurrentData() {
        return this.table ? this.table.rows().data().toArray() : [];
    }

    // Экспорт в Excel
    exportToExcel(data, filename = 'report.xlsx') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Отчет");
        XLSX.writeFile(wb, filename);
    }

    // Экспорт в CSV
    exportToCSV(data, filename = 'report.csv') {
        const csv = Papa.unparse(data);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, filename);
    }
}

// Делаем доступным глобально
window.TableRenderer = TableRenderer;