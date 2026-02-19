export const deviceTypes = [
    { id: 'ordenador', label: 'Ordenador', icon: 'Laptop' },
    { id: 'movil', label: 'Móvil', icon: 'Smartphone' },
    { id: 'pantalla', label: 'Pantalla', icon: 'Monitor' },
    { id: 'impresora', label: 'Impresora', icon: 'Printer' },
    { id: 'periferico', label: 'Periférico', icon: 'Mouse' },
    { id: 'tablet', label: 'Tablet', icon: 'Tablet' },
    { id: 'servidor', label: 'Servidor', icon: 'Server' },
    { id: 'redes', label: 'Redes', icon: 'Wifi' },
    { id: 'otro', label: 'Otro', icon: 'Box' },
];

export const deviceStatus = [
    { id: 'en_uso', label: 'En uso', color: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'stock', label: 'Stock', color: 'bg-blue-500/20 text-blue-400' },
    { id: 'reparacion', label: 'Reparación', color: 'bg-amber-500/20 text-amber-400' },
    { id: 'baja', label: 'Baja', color: 'bg-slate-700/50 text-slate-400' },
    { id: 'reservado', label: 'Reservado', color: 'bg-purple-500/20 text-purple-400' },
];

export const predefinedCatalog = {
    ordenador: {
        brands: ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Microsoft', 'MSI', 'Razer', 'Samsung', 'LG', 'Huawei', 'Toshiba', 'Dynabook', 'Fujitsu', 'Panasonic', 'Alienware', 'Gigabyte'],
        models: {
            'Dell': ['Latitude 3420', 'Latitude 3520', 'Latitude 5320', 'Latitude 5420', 'Latitude 5520', 'Latitude 7320', 'Latitude 7420', 'Latitude 7520', 'Latitude 9420', 'XPS 13', 'XPS 15', 'XPS 17', 'Precision 3000', 'Precision 5000', 'Precision 7000', 'OptiPlex 3080', 'OptiPlex 5080', 'OptiPlex 7080', 'Vostro 15', 'Inspiron 14', 'Inspiron 15', 'Inspiron 16'],
            'HP': ['ProBook 430', 'ProBook 440', 'ProBook 450', 'ProBook 635', 'EliteBook 630', 'EliteBook 640', 'EliteBook 650', 'EliteBook 830', 'EliteBook 840', 'EliteBook 850', 'EliteBook x360', 'ZBook Firefly', 'ZBook Power', 'ZBook Studio', 'ZBook Fury', 'Pavilion 14', 'Pavilion 15', 'Envy 13', 'Envy 15', 'Spectre x360', 'OMEN 15', 'Victus 16'],
            'Lenovo': ['ThinkPad E14', 'ThinkPad E15', 'ThinkPad L13', 'ThinkPad L14', 'ThinkPad L15', 'ThinkPad T14', 'ThinkPad T14s', 'ThinkPad T15', 'ThinkPad X1 Carbon', 'ThinkPad X1 Yoga', 'ThinkPad X1 Nano', 'ThinkPad X13', 'ThinkBook 13s', 'ThinkBook 14', 'ThinkBook 15', 'IdeaPad 3', 'IdeaPad 5', 'IdeaPad Flex', 'Legion 5', 'Legion 7', 'Yoga 7i', 'Yoga 9i'],
            'Apple': ['MacBook Air M1', 'MacBook Air M2', 'MacBook Air M3', 'MacBook Pro 13" M1', 'MacBook Pro 13" M2', 'MacBook Pro 14" M1 Pro/Max', 'MacBook Pro 14" M2 Pro/Max', 'MacBook Pro 14" M3', 'MacBook Pro 16" M1 Pro/Max', 'MacBook Pro 16" M2 Pro/Max', 'MacBook Pro 16" M3', 'iMac 24"', 'Mac mini M1', 'Mac mini M2', 'Mac Studio M1', 'Mac Studio M2', 'Mac Pro'],
            'Microsoft': ['Surface Laptop 3', 'Surface Laptop 4', 'Surface Laptop 5', 'Surface Laptop Go', 'Surface Laptop Studio', 'Surface Pro 7', 'Surface Pro 8', 'Surface Pro 9', 'Surface Go 2', 'Surface Go 3', 'Surface Book 3'],
            'Asus': ['ExpertBook B1', 'ExpertBook B3', 'ExpertBook B5', 'ExpertBook B7', 'ExpertBook B9', 'VivoBook 15', 'VivoBook Pro', 'ZenBook 13', 'ZenBook 14', 'ZenBook Duo', 'ROG Zephyrus', 'ROG Strix', 'TUF Gaming'],
            'Acer': ['Extensa 15', 'TravelMate P2', 'TravelMate P4', 'TravelMate P6', 'Spin 3', 'Spin 5', 'Swift 3', 'Swift 5', 'Aspire 3', 'Aspire 5', 'Aspire 7', 'Nitro 5', 'Predator Helios'],
            'MSI': ['Modern 14', 'Modern 15', 'Prestige 14', 'Prestige 15', 'Summit E13', 'Summit E16', 'Raider GE76', 'Stealth GS66', 'Katana GF66'],
        }
    },
    movil: {
        brands: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus', 'Oppo', 'Vivo', 'Realme', 'Sony', 'Motorola', 'Nokia', 'Honor', 'Nothing', 'Asus'],
        models: {
            'Apple': ['iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone 12', 'iPhone 11', 'iPhone SE (2nd)', 'iPhone SE (3rd)'],
            'Samsung': ['Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy S23+', 'Galaxy S23 Ultra', 'Galaxy S22', 'Galaxy S21 FE', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy Z Fold4', 'Galaxy Z Flip4', 'Galaxy A54', 'Galaxy A34', 'Galaxy A14', 'Galaxy A53', 'Galaxy A33', 'Galaxy M54', 'Galaxy XCover 6 Pro'],
            'Xiaomi': ['Xiaomi 14', 'Xiaomi 14 Pro', 'Xiaomi 14 Ultra', 'Xiaomi 13T', 'Xiaomi 13T Pro', 'Xiaomi 13', 'Xiaomi 13 Pro', 'Xiaomi 12T', 'Redmi Note 13', 'Redmi Note 13 Pro', 'Redmi Note 13 Pro+', 'Redmi Note 12', 'Redmi 12', 'POCO F5', 'POCO X6', 'POCO X6 Pro', 'POCO M6 Pro'],
            'Google': ['Pixel 8', 'Pixel 8 Pro', 'Pixel 7a', 'Pixel 7', 'Pixel 7 Pro', 'Pixel 6a', 'Pixel 6', 'Pixel 6 Pro', 'Pixel Fold'],
            'OnePlus': ['OnePlus 12', 'OnePlus 12R', 'OnePlus 11', 'OnePlus 10T', 'OnePlus 10 Pro', 'OnePlus Nord 3', 'OnePlus Nord CE 3'],
            'Motorola': ['Edge 40', 'Edge 40 Pro', 'Edge 30', 'Edge 30 Ultra', 'Moto G84', 'Moto G54', 'Moto G14', 'ThinkPhone'],
            'Oppo': ['Find X6 Pro', 'Find X5 Pro', 'Reno 10', 'Reno 10 Pro', 'A98', 'A78'],
            'Sony': ['Xperia 1 V', 'Xperia 5 V', 'Xperia 10 V', 'Xperia 1 IV', 'Xperia 5 IV'],
        }
    },
    pantalla: {
        brands: ['Dell', 'HP', 'LG', 'Samsung', 'BenQ', 'Philips', 'Asus', 'Acer', 'Lenovo', 'ViewSonic', 'MSI', 'NEC', 'Eizo'],
        models: {
            'Dell': ['E1916H', 'E2016H', 'E2216H', 'E2422H', 'P2219H', 'P2419H', 'P2422H', 'P2719H', 'P2722H', 'U2422H', 'U2722DE', 'U3223QE', 'U3423WE', 'U3821DW', 'U4021QW', 'U4320Q', 'S2421H', 'S2721DGF'],
            'HP': ['P22h G4', 'P24h G4', 'P27h G4', 'E22 G4', 'E23 G4', 'E24 G4', 'E24i G4', 'E24u G4', 'E27 G4', 'E27q G4', 'Z24f G3', 'Z27k G3', 'Z32k G3'],
            'LG': ['22MN430M', '24MK600M', '27MK600M', '24QP500', '27QP880', '27UP850', '29WP60G', '34WP65G', '32UN880', '38WN95C', '49WL95C'],
            'Samsung': ['F24T350', 'F27T350', 'S24A600', 'S27A600', 'S32A600', 'S34A650', 'S49A950', 'Odyssey G3', 'Odyssey G5', 'Odyssey G7', 'Odyssey G9', 'Smart Monitor M5', 'Smart Monitor M7', 'Smart Monitor M8'],
            'BenQ': ['GW2280', 'GW2480', 'GW2780', 'BL2420PT', 'PD2700U', 'PD3200U', 'SW270C', 'MOBIUZ EX2510', 'Zowie XL2546K'],
            'Philips': ['221V8', '241V8', '271V8', '242B1', '272B1', '346B1C', '499P9H', '279P1'],
            'Asus': ['VA24EHE', 'VA27EHE', 'VP249QGR', 'VG248QG', 'VG27AQ', 'ProArt PA248QV', 'ProArt PA278QV', 'TUF Gaming VG27WQ'],
        }
    },
    impresora: {
        brands: ['HP', 'Brother', 'Epson', 'Canon', 'Kyocera', 'Xerox', 'Ricoh', 'Lexmark', 'Samsung', 'Zebra'],
        models: {
            'HP': ['LaserJet Pro M15w', 'LaserJet Pro M404dn', 'LaserJet Pro M428fdw', 'LaserJet Enterprise M507', 'Color LaserJet Pro M255dw', 'Color LaserJet Pro M479fdw', 'OfficeJet Pro 8022', 'OfficeJet Pro 9010', 'OfficeJet Pro 9022', 'DeskJet 2720', 'DeskJet 3760'],
            'Brother': ['HL-L2350DW', 'HL-L2370DN', 'HL-L3210CW', 'HL-L3270CDW', 'DCP-L2530DW', 'MFC-L2710DW', 'MFC-L2750DW', 'MFC-L3750CDW', 'MFC-L8690CDW', 'MFC-J5330DW', 'Q L-800'],
            'Epson': ['EcoTank ET-2810', 'EcoTank ET-2850', 'EcoTank ET-3850', 'EcoTank ET-4850', 'WorkForce WF-2850', 'WorkForce Pro WF-3820', 'WorkForce Pro WF-4820', 'WorkForce Pro WF-C5790'],
            'Canon': ['PIXMA TS3350', 'PIXMA TR4550', 'PIXMA G3501', 'MAXIFY GX6050', 'i-SENSYS LBP623Cdw', 'i-SENSYS MF643Cdw', 'i-SENSYS MF742Cdw', 'imageRUNNER 2630i'],
            'Kyocera': ['Ecosys P2040dn', 'Ecosys P2235dn', 'Ecosys M2135dn', 'Ecosys M2540dn', 'Ecosys M5521cdw', 'Ecosys P5021cdw', 'TASKalfa 2554ci'],
            'Xerox': ['Phaser 3020', 'B230', 'C230', 'B225', 'C235', 'VersaLink B400', 'VersaLink C400', 'AltaLink C8130'],
        }
    },
    periferico: {
        brands: ['Logitech', 'Dell', 'HP', 'Microsoft', 'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'Keychron', 'Jabra', 'Plantronics', 'Poly'],
        models: {
            'Logitech': ['MX Master 3S', 'MX Master 2S', 'MX Anywhere 3', 'MX Keys', 'MX Keys Mini', 'MX Mechanical', 'K400 Plus', 'K380', 'MK270', 'MK295', 'MK540', 'C920 Webcam', 'C925e Webcam', 'Brio 4K', 'H390 Headset', 'H540 Headset', 'Zone Wireless'],
            'Dell': ['Premier Multi-Device Mouse MS7421W', 'Mobile Pro Wireless Mouse MS5120W', 'Laser Wired Mouse MS3220', 'Premier Multi-Device Keyboard KM7321W', 'Pro Wireless Keyboard KM5221W', 'Wired Keyboard KB216'],
            'Microsoft': ['Surface Arc Mouse', 'Modern Mobile Mouse', 'Bluetooth Ergonomic Mouse', 'Sculpt Ergonomic Desktop', 'Surface Keyboard', 'Designer Compact Keyboard', 'LifeCam HD-3000', 'Modern Wireless Headset'],
            'Jabra': ['Evolve 20', 'Evolve 30', 'Evolve 40', 'Evolve 65', 'Evolve2 30', 'Evolve2 40', 'Evolve2 65', 'Evolve2 75', 'Speak 510', 'Speak 710', 'Speak 750'],
            'Poly': ['Blackwire 3220', 'Blackwire 3320', 'Blackwire 5220', 'Voyager 4320', 'Voyager Focus 2', 'Sync 20', 'Sync 40'],
        }
    },
    tablet: {
        brands: ['Apple', 'Samsung', 'Lenovo', 'Microsoft', 'Amazon', 'Xiaomi', 'Huawei'],
        models: {
            'Apple': ['iPad Pro 12.9" (6th gen)', 'iPad Pro 11" (4th gen)', 'iPad Air (5th gen)', 'iPad (10th gen)', 'iPad (9th gen)', 'iPad mini (6th gen)'],
            'Samsung': ['Galaxy Tab S9 Ultra', 'Galaxy Tab S9+', 'Galaxy Tab S9', 'Galaxy Tab S8 Ultra', 'Galaxy Tab S8', 'Galaxy Tab S7 FE', 'Galaxy Tab A9+', 'Galaxy Tab A9', 'Galaxy Tab Active4 Pro'],
            'Lenovo': ['Tab P12 Pro', 'Tab P11 Pro', 'Tab P11', 'Tab M10 Plus', 'Yoga Tab 13', 'Yoga Tab 11'],
            'Microsoft': ['Surface Pro 9', 'Surface Pro 8', 'Surface Go 3', 'Surface Go 2'],
            'Xiaomi': ['Pad 6 Max', 'Pad 6 Pro', 'Pad 6', 'Pad 5', 'Redmi Pad SE', 'Redmi Pad'],
        }
    },
    servidor: {
        brands: ['Dell', 'HPE', 'Lenovo', 'Cisco', 'Supermicro', 'Synology', 'QNAP'],
        models: {
            'Dell': ['PowerEdge T40', 'PowerEdge T150', 'PowerEdge T350', 'PowerEdge T550', 'PowerEdge R250', 'PowerEdge R350', 'PowerEdge R450', 'PowerEdge R550', 'PowerEdge R650', 'PowerEdge R750'],
            'HPE': ['ProLiant ML30 Gen10', 'ProLiant ML110 Gen10', 'ProLiant ML350 Gen10', 'ProLiant DL20 Gen10', 'ProLiant DL160 Gen10', 'ProLiant DL180 Gen10', 'ProLiant DL325 Gen10', 'ProLiant DL360 Gen10', 'ProLiant DL380 Gen10', 'MicroServer Gen10 Plus'],
            'Lenovo': ['ThinkSystem ST50', 'ThinkSystem ST250', 'ThinkSystem ST550', 'ThinkSystem SR250', 'ThinkSystem SR530', 'ThinkSystem SR550', 'ThinkSystem SR630', 'ThinkSystem SR650'],
            'Synology': ['DS220j', 'DS220+', 'DS224+', 'DS423+', 'DS723+', 'DS923+', 'DS1522+', 'DS1621+', 'DS1821+', 'RS422+', 'RS822+'],
            'QNAP': ['TS-233', 'TS-262', 'TS-462', 'TS-464', 'TS-664', 'TVS-h674', 'TVS-h874'],
        }
    },
    redes: {
        brands: ['Cisco', 'Ubiquiti', 'Aruba', 'MikroTik', 'TP-Link', 'Netgear', 'D-Link', 'Fortinet', 'Palo Alto', 'SonicWall'],
        models: {
            'Cisco': ['Switch Catalyst 1000', 'Switch Catalyst 9200', 'Switch CBS250', 'Switch CBS350', 'Router ISR 1100', 'Access Point C9105', 'Access Point C9115', 'Access Point C9120'],
            'Ubiquiti': ['UniFi Dream Machine Pro', 'UniFi Dream Machine SE', 'Switch Pro 24 PoE', 'Switch Pro 48 PoE', 'Switch Enterprise 24 PoE', 'AP U6 Lite', 'AP U6 Pro', 'AP U6 LR', 'AP U6 Enterprise', 'EdgeRouter 4', 'EdgeRouter X'],
            'Aruba': ['Instant On 1930 Switch', 'Instant On 1960 Switch', 'Instant On AP11', 'Instant On AP22', 'Instant On AP25'],
            'MikroTik': ['hEX S', 'RB4011', 'RB5009', 'CCR2004', 'CRS326', 'cAP ax', 'wAP ac'],
            'Fortinet': ['FortiGate 40F', 'FortiGate 60F', 'FortiGate 80F', 'FortiGate 100F', 'FortiAP 231F'],
        }
    }
};
