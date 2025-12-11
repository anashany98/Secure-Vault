import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('secure_vault_theme');
        return stored || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('secure_vault_theme', theme);

        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);

        // Update body class for Tailwind
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setDarkMode = () => setTheme('dark');
    const setLightMode = () => setTheme('light');

    return (
        <ThemeContext.Provider value={{
            theme,
            isDark: theme === 'dark',
            isLight: theme === 'light',
            toggleTheme,
            setDarkMode,
            setLightMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
