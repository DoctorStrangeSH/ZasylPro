class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.setupToggle();
        this.setupSystemThemeListener();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        this.theme = theme;
        localStorage.setItem('theme', theme);
        
        // Обновляем DataTables тему
        if ($.fn.dataTable) {
            $('.table').each(function() {
                const table = $(this).DataTable();
                if (table) {
                    table.draw();
                }
            });
        }
    }

    toggle() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.animateToggle();
    }

    setupToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }

    setupSystemThemeListener() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    animateToggle() {
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                icon.style.transform = '';
            }, 300);
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});