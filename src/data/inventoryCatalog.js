export const deviceTypes = [
    { id: 'ordenador', label: 'Ordenador', icon: 'Laptop' },
    { id: 'movil', label: 'Móvil', icon: 'Smartphone' },
    { id: 'pantalla', label: 'Pantalla', icon: 'Monitor' },
    { id: 'impresora', label: 'Impresora', icon: 'Printer' },
    { id: 'periferico', label: 'Periférico', icon: 'Mouse' },
    { id: 'otro', label: 'Otro', icon: 'Box' },
];

export const deviceStatus = [
    { id: 'en_uso', label: 'En uso', color: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'stock', label: 'Stock', color: 'bg-blue-500/20 text-blue-400' },
    { id: 'reparacion', label: 'Reparación', color: 'bg-amber-500/20 text-amber-400' },
    { id: 'baja', label: 'Baja', color: 'bg-slate-700/50 text-slate-400' },
];

export const predefinedCatalog = {
    ordenador: {
        brands: ['Dell', 'HP', 'Lenovo', 'Apple', 'Microsoft', 'Asus', 'Acer'],
        models: {
            'Dell': ['Latitude 5420', 'Latitude 7420', 'OptiPlex 3080', 'XPS 13', 'XPS 15', 'Precision 3000'],
            'HP': ['ProBook 450', 'EliteBook 840', 'ZBook Firefly', 'Pavilion 15'],
            'Lenovo': ['ThinkPad T14', 'ThinkPad X1 Carbon', 'ThinkBook 15', 'IdeaPad 3'],
            'Apple': ['MacBook Air M1', 'MacBook Air M2', 'MacBook Pro 13"', 'MacBook Pro 14"', 'MacBook Pro 16"', 'iMac 24"'],
            'Microsoft': ['Surface Laptop 4', 'Surface Pro 7', 'Surface Pro 8', 'Surface Go 3'],
        }
    },
    movil: {
        brands: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus'],
        models: {
            'Apple': ['iPhone 15', 'iPhone 15 Pro', 'iPhone 14', 'iPhone 13', 'iPhone SE'],
            'Samsung': ['Galaxy S24', 'Galaxy S23', 'Galaxy A54', 'Galaxy A34', 'Galaxy Z Flip5'],
            'Xiaomi': ['Redmi Note 13', 'Xiaomi 13T', 'POCO X6'],
            'Google': ['Pixel 8', 'Pixel 7a', 'Pixel 7'],
        }
    },
    pantalla: {
        brands: ['Dell', 'HP', 'LG', 'Samsung', 'BenQ', 'Philips'],
        models: {
            'Dell': ['P2419H', 'U2422H', 'P2719H', 'U2722DE'],
            'HP': ['E24 G4', 'E27 G4', '24mh', '27f'],
            'Samsung': ['T350', 'T450', 'S60UA'],
            'LG': ['24MK600', '27MK600', '29WP60G (Ultrawide)'],
        }
    },
    impresora: {
        brands: ['HP', 'Brother', 'Epson', 'Canon', 'Kyocera'],
        models: {
            'HP': ['LaserJet Pro M404dn', 'LaserJet Pro MFP 428fdw', 'OfficeJet Pro 9010'],
            'Brother': ['HL-L2350DW', 'MFC-L2710DW', 'HL-L3270CDW'],
            'Epson': ['EcoTank ET-2810', 'WorkForce WF-2850'],
        }
    },
    periferico: {
        brands: ['Logitech', 'Dell', 'HP', 'Microsoft', 'Razer'],
        models: {
            'Logitech': ['MX Master 3S', 'MX Keys', 'K400 Plus', 'C920 Webcam', 'H390 Headset'],
            'Dell': ['KM636 Wireless Keyboard', 'MS116 Mouse'],
        }
    }
};
