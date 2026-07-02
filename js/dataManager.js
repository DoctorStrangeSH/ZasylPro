class DataManager {
    constructor() {
        this.orders = [];
        this.zasyls = [];
        this.shifts = [];
        this.companies = [];
        this.mergedData = [];
    }

    // Загрузка данных о заказах
    async loadOrders(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    this.orders = XLSX.utils.sheet_to_json(firstSheet);
                    
                    // Сохраняем в localStorage
                    localStorage.setItem('orders', JSON.stringify(this.orders));
                    resolve(this.orders);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsBinaryString(file);
        });
    }

    // Загрузка данных о засылах
    async loadZasyls(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    this.zasyls = XLSX.utils.sheet_to_json(firstSheet);
                    
                    // Сохраняем в localStorage
                    localStorage.setItem('zasyls', JSON.stringify(this.zasyls));
                    resolve(this.zasyls);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsBinaryString(file);
        });
    }

    // Загрузка данных о сменах и компаниях
    async loadShifts(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    this.shifts = XLSX.utils.sheet_to_json(firstSheet);
                    
                    // Извлекаем компании
                    this.extractCompanies();
                    
                    // Сохраняем в localStorage
                    localStorage.setItem('shifts', JSON.stringify(this.shifts));
                    localStorage.setItem('companies', JSON.stringify(this.companies));
                    resolve(this.shifts);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsBinaryString(file);
        });
    }

    // Извлечение компаний из данных смен
    extractCompanies() {
        const companiesSet = new Set();
        this.shifts.forEach(shift => {
            if (shift.Компания) {
                companiesSet.add(shift.Компания);
            }
        });
        this.companies = Array.from(companiesSet);
    }

    // Объединение данных
    mergeData() {
        this.mergedData = [];
        
        this.orders.forEach(order => {
            // Находим соответствующий засыл
            const zasyl = this.zasyls.find(z => 
                z['Номер заказа'] === order['Номер заказа'] || 
                z['Номер грузоместа'] === order['Номер грузоместа']
            );
            
            // Находим информацию о смене
            const shift = this.shifts.find(s => 
                s['Номер заказа'] === order['Номер заказа'] ||
                (zasyl && s['Номер грузоместа'] === zasyl['Номер грузоместа'])
            );
            
            // Формируем объединенную запись
            const mergedRecord = {
                'Номер грузоместа': order['Номер грузоместа'] || '-',
                'Номер заказа': order['Номер заказа'] || '-',
                'Стоимость': order['Стоимость'] || 0,
                'Кто отправил': order['Кто отправил'] || '-',
                'Куда должны были отправить': order['Куда должны были отправить'] || '-',
                'Куда отправили засыл': zasyl ? zasyl['Куда отправили засыл'] : '-',
                'Номер смены': shift ? shift['Номер смены'] : '-',
                'Зона сортировки': order['Зона сортировки'] || '-',
                'ФИО засыльщика': zasyl ? zasyl['ФИО засыльщика'] : '-',
                'Компания': shift ? shift['Компания'] : '-',
                'Дата засыла': zasyl ? zasyl['Дата засыла'] : '-',
                'Почему не засыл?': zasyl ? (zasyl['Почему не засыл?'] || '-') : 'Нет данных о засыле',
                'Статус': zasyl ? 'Засыл' : 'Не засыл'
            };
            
            this.mergedData.push(mergedRecord);
        });
        
        // Сохраняем объединенные данные
        localStorage.setItem('mergedData', JSON.stringify(this.mergedData));
        
        return this.mergedData;
    }

    // Получение уникальных значений для фильтров
    getUniqueValues(field) {
        const values = new Set();
        this.mergedData.forEach(record => {
            if (record[field] && record[field] !== '-') {
                values.add(record[field]);
            }
        });
        return Array.from(values);
    }

    // Фильтрация данных
    filterData(filters) {
        return this.mergedData.filter(record => {
            let match = true;
            
            if (filters.dateFrom) {
                match = match && record['Дата засыла'] >= filters.dateFrom;
            }
            
            if (filters.dateTo) {
                match = match && record['Дата засыла'] <= filters.dateTo;
            }
            
            if (filters.status && filters.status !== 'all') {
                match = match && record['Статус'] === filters.status;
            }
            
            if (filters.orderSearch) {
                const searchTerm = filters.orderSearch.toLowerCase();
                match = match && record['Номер заказа'].toString().toLowerCase().includes(searchTerm);
            }
            
            if (filters.zasylshik) {
                const searchTerm = filters.zasylshik.toLowerCase();
                match = match && record['ФИО засыльщика'].toString().toLowerCase().includes(searchTerm);
            }
            
            return match;
        });
    }

    // Получение статистики
    getStatistics(data = null) {
        const targetData = data || this.mergedData;
        
        return {
            total: targetData.length,
            zasyls: targetData.filter(r => r['Статус'] === 'Засыл').length,
            noZasyls: targetData.filter(r => r['Статус'] === 'Не засыл').length,
            totalCost: targetData.reduce((sum, r) => sum + (parseFloat(r['Стоимость']) || 0), 0)
        };
    }

    // Загрузка данных из localStorage
    loadFromStorage() {
        const orders = localStorage.getItem('orders');
        const zasyls = localStorage.getItem('zasyls');
        const shifts = localStorage.getItem('shifts');
        const companies = localStorage.getItem('companies');
        const mergedData = localStorage.getItem('mergedData');
        
        if (orders) this.orders = JSON.parse(orders);
        if (zasyls) this.zasyls = JSON.parse(zasyls);
        if (shifts) this.shifts = JSON.parse(shifts);
        if (companies) this.companies = JSON.parse(companies);
        if (mergedData) this.mergedData = JSON.parse(mergedData);
        
        return {
            hasOrders: this.orders.length > 0,
            hasZasyls: this.zasyls.length > 0,
            hasShifts: this.shifts.length > 0,
            hasMergedData: this.mergedData.length > 0
        };
    }

    // Очистка всех данных
    clearAllData() {
        this.orders = [];
        this.zasyls = [];
        this.shifts = [];
        this.companies = [];
        this.mergedData = [];
        
        localStorage.removeItem('orders');
        localStorage.removeItem('zasyls');
        localStorage.removeItem('shifts');
        localStorage.removeItem('companies');
        localStorage.removeItem('mergedData');
    }
}