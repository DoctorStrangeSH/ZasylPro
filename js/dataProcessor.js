class DataProcessor {
    constructor() {
        this.ordersData = null;
        this.zasylsData = null;
        this.shiftsData = null;
        this.processedData = null;
        this.errors = [];
        this.warnings = [];
    }

    async loadExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    console.log(`📁 Листов в файле: ${workbook.SheetNames.length}`);
                    console.log('📋 Имена листов:', workbook.SheetNames);
                    
                    let allHeaders = null;
                    let allRows = [];
                    
                    // Проходим по ВСЕМ листам
                    workbook.SheetNames.forEach(sheetName => {
                        const worksheet = workbook.Sheets[sheetName];
                        
                        const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
                            header: 1,
                            defval: '',
                            raw: false
                        });
                        
                        if (sheetData.length === 0) return;
                        
                        console.log(`📄 Лист "${sheetName}": ${sheetData.length} строк`);
                        
                        // Первая строка — заголовки
                        const rawHeaders = sheetData[0];
                        let headers = [];
                        rawHeaders.forEach(header => {
                            const parts = String(header).split('\t');
                            parts.forEach(part => {
                                const trimmed = part.trim();
                                if (trimmed) headers.push(trimmed);
                            });
                        });
                        
                        // Если заголовки ещё не сохранены — сохраняем
                        if (!allHeaders) {
                            allHeaders = headers;
                            console.log('📋 Заголовки:', allHeaders);
                        }
                        
                        // Данные (пропускаем заголовки)
                        const rows = sheetData.slice(1);
                        
                        rows.forEach(row => {
                            let allValues = [];
                            row.forEach(cell => {
                                const parts = String(cell).split('\t');
                                parts.forEach(part => allValues.push(part.trim()));
                            });
                            
                            // Проверяем что строка не пустая
                            const hasData = allValues.some(v => v !== '' && v !== 'Общий итог' && v !== 'Итого');
                            if (hasData) {
                                allRows.push(allValues);
                            }
                        });
                    });
                    
                    // Конвертируем в объекты
                    const result = [];
                    allRows.forEach(values => {
                        const obj = {};
                        allHeaders.forEach((header, index) => {
                            obj[header] = values[index] !== undefined ? values[index] : '';
                        });
                        result.push(obj);
                    });
                    
                    console.log(`📊 Всего загружено: ${result.length} записей`);
                    
                    if (result.length > 0) {
                        console.log('📋 Первая запись:', result[0]);
                    }
                    
                    resolve({
                        data: result,
                        sheetName: workbook.SheetNames.join(', '),
                        rowCount: result.length,
                        headers: allHeaders
                    });
                    
                } catch (error) {
                    reject(new Error(`Ошибка чтения файла: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsArrayBuffer(file);
        });
    }

    findColumn(data, possibleNames) {
        if (!data || data.length === 0) return null;
        const headers = Object.keys(data[0]);
        
        for (let name of possibleNames) {
            const found = headers.find(h => h === name);
            if (found) return found;
        }
        for (let name of possibleNames) {
            const found = headers.find(h => h.toLowerCase() === name.toLowerCase());
            if (found) return found;
        }
        for (let name of possibleNames) {
            const found = headers.find(h => h.toLowerCase().includes(name.toLowerCase()));
            if (found) return found;
        }
        return null;
    }

    async processFiles(ordersFile, zasylsFile, shiftsFile = null) {
        this.errors = [];
        this.warnings = [];
        
        try {
            console.log('🚀 Начинаем обработку...');
            
            const ordersResult = await this.loadExcelFile(ordersFile);
            this.ordersData = ordersResult.data;
            console.log(`✅ Заказы: ${ordersResult.rowCount} записей`);
            
            const zasylsResult = await this.loadExcelFile(zasylsFile);
            this.zasylsData = zasylsResult.data;
            console.log(`✅ Засылы: ${zasylsResult.rowCount} записей`);
            
            if (shiftsFile) {
                const shiftsResult = await this.loadExcelFile(shiftsFile);
                this.shiftsData = shiftsResult.data;
            }
            
            this.analyzeDataStructure();
            this.processedData = this.mergeAllData();
            
            console.log(`✅ Готово: ${this.processedData.length} записей`);
            
            return {
                success: true,
                data: this.processedData,
                stats: this.getStatistics(),
                errors: this.errors,
                warnings: this.warnings
            };
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.errors.push(error.message);
            return { success: false, error: error.message, errors: this.errors };
        }
    }

    analyzeDataStructure() {
        if (this.zasylsData && this.zasylsData.length > 0) {
            this.columnMapping = {
                zasyls: {
                    placeExternalId: this.findColumn(this.zasylsData, ['Номер грузоместа']),
                    orderExternalId: this.findColumn(this.zasylsData, ['Номер заказа']),
                    cost: this.findColumn(this.zasylsData, ['Стоимость']),
                    sender: this.findColumn(this.zasylsData, ['Кто отправил']),
                    plannedDestination: this.findColumn(this.zasylsData, ['Куда должны были отправить']),
                    actualDestination: this.findColumn(this.zasylsData, ['Куда отправили засыл'])
                }
            };
            console.log('✅ Маппинг засылов:', this.columnMapping.zasyls);
        }
    }

    mergeAllData() {
        console.log(`🔄 Объединяем ${this.zasylsData.length} засылов`);
        
        const merged = [];
        
        this.zasylsData.forEach((zasyl, index) => {
            const packageNum = this.getField(zasyl, this.columnMapping.zasyls.placeExternalId);
            const orderNum = this.getField(zasyl, this.columnMapping.zasyls.orderExternalId);
            const cost = this.getField(zasyl, this.columnMapping.zasyls.cost);
            const sender = this.getField(zasyl, this.columnMapping.zasyls.sender);
            const plannedDest = this.getField(zasyl, this.columnMapping.zasyls.plannedDestination);
            const actualDest = this.getField(zasyl, this.columnMapping.zasyls.actualDestination);
            
            // Ищем в логах
            const orderLogs = this.findAllOrderLogs(orderNum, packageNum);
            const extracted = this.extractDataFromLogs(orderLogs);
            
            const record = {
                'Номер грузоместа': packageNum || '',
                'Номер заказа': orderNum || '',
                'Стоимость': this.parseCost(cost),
                'Кто отправил': sender || '',
                'Куда должны были отправить': plannedDest || '',
                'Куда отправили засыл': actualDest || '',
                'Номер смены': extracted.shiftNumber,
                'Зона сортировки': extracted.zoneName,
                'ФИО засыльщика': extracted.username,
                'Компания': extracted.company,
                'Дата засыла': extracted.date,
                'Почему не засыл?': '',
                'Статус': ''
            };
            
            merged.push(record);
        });
        
        console.log(`✅ Объединено ${merged.length} записей`);
        
        const withZone = merged.filter(r => r['Зона сортировки'] !== '' && r['Зона сортировки'] !== '-').length;
        const withUser = merged.filter(r => r['ФИО засыльщика'] !== '' && r['ФИО засыльщика'] !== '-').length;
        console.log(`📊 С зоной: ${withZone}, С ФИО: ${withUser}`);
        
        return merged;
    }

    getField(obj, fieldName) {
        if (!obj || !fieldName) return null;
        const value = obj[fieldName];
        if (!value || value === '') return null;
        return String(value).trim();
    }

    findAllOrderLogs(orderNum, packageNum) {
        const logs = [];
        if (!this.ordersData) return logs;
        
        this.ordersData.forEach(row => {
            const rowOrder = String(row.order_external_id || '').trim();
            const rowPlace = String(row.place_external_id || '').trim();
            
            if (orderNum && rowOrder === orderNum) {
                logs.push(row);
            } else if (packageNum && rowPlace === packageNum) {
                logs.push(row);
            } else if (packageNum && rowPlace && packageNum.includes('-')) {
                const base = packageNum.split('-')[0];
                if (rowPlace === base || rowPlace.startsWith(base + '-')) {
                    logs.push(row);
                }
            }
        });
        
        return logs;
    }

    /**
     * Извлечение данных из логов с учётом правил:
     * 1. Если username = sc-robot-ship - ищем ФИО из предыдущих операций
     * 2. Если зона содержит "Первичная приемка" или "Приемка" - ФИО не ставим
     * 3. "Почему не засыл" - оставляем пустым всегда
     * 4. Статус - не заполняем (пользователь ставит сам)
     * 5. Пропускаем зоны: Воротная группа, Бригадир, SKK, Зона сортировки возвратов, Предсортировка возвратов
     */
    extractDataFromLogs(allLogs) {
        const result = {
            shiftNumber: '',
            zoneName: '',
            username: '',
            company: '',
            date: '',
            reason: '',
            status: ''
        };
        
        if (allLogs.length === 0) return result;
        
        // Сортируем логи по времени (новые первые)
        const sortedLogs = [...allLogs].sort((a, b) => {
            return this.parseDate(b.scanned_at) - this.parseDate(a.scanned_at);
        });
        
        // Список зон, которые нужно пропускать
        const skipZones = [
            'воротная группа',
            'бригадир',
            'skk',
            'специалистов по контролю качества',
            'зона сортировки возвратов',
            'зона предсортировки возвратов',
            'vor',
            'vso'
        ];
        
        // Проверяем, является ли зона "пропускаемой"
        const isSkipZone = (zoneName) => {
            if (!zoneName) return true; // Пустая зона тоже пропускается
            const lower = zoneName.toLowerCase();
            return skipZones.some(skip => lower.includes(skip));
        };
        
        // Ищем лучшую запись для зоны и даты
        let bestLog = null;
        
        // 1. Ищем SORT с OK (не робот) и НЕ в пропускаемой зоне
        bestLog = sortedLogs.find(row => 
            row.flow_name === 'SORT' && 
            row.result === 'OK' && 
            !String(row.username).includes('sc-robot') &&
            !isSkipZone(row.zone_name)
        );
        
        // 2. Ищем SORT с OK (любой) и НЕ в пропускаемой зоне
        if (!bestLog) {
            bestLog = sortedLogs.find(row => 
                row.flow_name === 'SORT' && 
                row.result === 'OK' &&
                !isSkipZone(row.zone_name)
            );
        }
        
        // 3. Ищем любую операцию с OK (не робот) и НЕ в пропускаемой зоне
        if (!bestLog) {
            bestLog = sortedLogs.find(row => 
                row.result === 'OK' && 
                !String(row.username).includes('sc-robot') &&
                !isSkipZone(row.zone_name)
            );
        }
        
        // 4. Любая операция с OK и НЕ в пропускаемой зоне
        if (!bestLog) {
            bestLog = sortedLogs.find(row => 
                row.result === 'OK' &&
                !isSkipZone(row.zone_name)
            );
        }
        
        // 5. Первая попавшаяся НЕ в пропускаемой зоне
        if (!bestLog) {
            bestLog = sortedLogs.find(row => !isSkipZone(row.zone_name));
        }
        
        // 6. Если все зоны пропускаемые — берем первую попавшуюся
        if (!bestLog) {
            bestLog = sortedLogs[0];
        }
        
        // Заполняем дату
        result.date = this.formatDate(bestLog.scanned_at);
        
        // Заполняем зону
        result.zoneName = bestLog.zone_name || '';
        
        // Если зона всё ещё пропускаемая — ищем предыдущий скан с нормальной зоной
        if (isSkipZone(result.zoneName)) {
            const normalLog = sortedLogs.find(row => 
                !isSkipZone(row.zone_name) &&
                row.place_external_id === bestLog.place_external_id
            );
            
            if (normalLog) {
                result.zoneName = normalLog.zone_name || result.zoneName;
                result.date = this.formatDate(normalLog.scanned_at) || result.date;
                bestLog = normalLog;
            }
        }
        
        // Проверяем: если зона содержит "первичная приемка" или "приемка" - ФИО не ставим
        const zoneLower = result.zoneName.toLowerCase();
        const isPervichka = zoneLower.includes('первичная приемка') || 
                           zoneLower.includes('приемка') ||
                           zoneLower.includes('предсортировки');
        
        // Заполняем ФИО
        if (isPervichka) {
            // Первичная приемка - ФИО не ставим
            result.username = '';
        } else if (String(bestLog.username).includes('sc-robot')) {
            // Робот - ищем последнее человеческое ФИО из предыдущих операций
            const humanLog = sortedLogs.find(row => 
                row.username && 
                !String(row.username).includes('sc-robot') &&
                row.place_external_id === bestLog.place_external_id &&
                !isSkipZone(row.zone_name)
            );
            result.username = humanLog ? humanLog.username : '';
        } else {
            result.username = bestLog.username || '';
        }
        
        // reason всегда пустой
        result.reason = '';
        
        // status всегда пустой - пользователь ставит сам
        result.status = '';
        
        return result;
    }

    getStatistics(data = null) {
        const d = data || this.processedData;
        const total = d.length;
        const totalCost = d.reduce((sum, r) => sum + (parseFloat(r['Стоимость']) || 0), 0);
        const withZone = d.filter(r => r['Зона сортировки'] && r['Зона сортировки'] !== '-' && r['Зона сортировки'] !== '').length;
        const withUser = d.filter(r => r['ФИО засыльщика'] && r['ФИО засыльщика'] !== '-' && r['ФИО засыльщика'] !== '').length;
        
        return {
            total,
            withZone,
            withUser,
            totalCost,
            avgCost: total > 0 ? Math.round(totalCost / total) : 0,
            zonePercentage: total > 0 ? ((withZone / total) * 100).toFixed(1) : '0',
            userPercentage: total > 0 ? ((withUser / total) * 100).toFixed(1) : '0'
        };
    }

    filterData(filters) {
        return this.processedData.filter(record => {
            if (filters.status && filters.status !== 'all' && record['Статус'] !== filters.status) return false;
            if (filters.orderSearch && !String(record['Номер заказа']).toLowerCase().includes(filters.orderSearch.toLowerCase())) return false;
            return true;
        });
    }

    generateExcelReport(data, stats) {
        const wb = XLSX.utils.book_new();
        const wsData = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, wsData, "Результаты");
        return wb;
    }

    parseCost(value) {
        if (!value) return 0;
        const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    parseDate(dateString) {
        if (!dateString) return new Date(0);
        return new Date(dateString);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('ru-RU') + ' ' + 
                   date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateString;
        }
    }
}

window.DataProcessor = DataProcessor;