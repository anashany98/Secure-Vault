
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const cleanName = (name) => {
    if (!name) return '';
    return name.trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
};

const processFiles = () => {
    const datosPath = path.join(rootDir, 'datos.csv');
    const telefonosPath = path.join(rootDir, 'telefonos.csv');

    console.log(`Reading from: ${datosPath}`);
    console.log(`Reading from: ${telefonosPath}`);

    const datosContent = fs.readFileSync(datosPath, 'utf8');
    const telefonosContent = fs.readFileSync(telefonosPath, 'utf8');

    const datosParsed = Papa.parse(datosContent, { header: true, skipEmptyLines: true });
    console.log("Datos CSV Keys:", Object.keys(datosParsed.data[0]));
    const telefonosParsed = Papa.parse(telefonosContent, { header: true, skipEmptyLines: true });

    let allItems = [];

    // Process datos.csv (Main)
    datosParsed.data.forEach(row => {
        const customOwner = row['USUARIO DEPARTAMENTO terminal server'];
        const customFactusol = row['USUARIO FACTUSOL/CONTASOL'];

        if (customOwner || customFactusol) {
            let ownerRaw = (customFactusol && customFactusol !== 'SUPERVISOR') ? customFactusol : (customOwner || 'Usuario');
            const owner = cleanName(ownerRaw);

            const rowKeys = Object.keys(row);
            // Fuzzy match keys to handle encoding issues ('Ñ' vs '')
            const keyFactusolPass = rowKeys.find(k => k.trim().startsWith('CONTRASE') && !k.toLowerCase().includes('terminal') && k.trim().length < 15) || 'CONTRASEÑA';
            const keyEmailPass = rowKeys.find(k => k.startsWith('CONTRASE') && k.endsWith(' ')) || 'CONTRASEÑA ';
            const keyTerminalPass = rowKeys.find(k => k.includes('TERMINAL SERVER') && k.includes('CONTRASE')) || 'CONTRASEÑA             TERMINAL SERVER';
            const keyPhoneLegacy = rowKeys.find(k => k.startsWith('TELEFONO')) || 'TELEFONO';

            const passFactusol = row[keyFactusolPass];
            const passEmail = row[keyEmailPass];
            const passTerminal = row[keyTerminalPass];
            const phoneNumLegacy = row[keyPhoneLegacy];

            if (customOwner) {
                allItems.push({ type: 'Main', title: 'Terminal Server', username: customOwner, password: passTerminal, owner });
            }
            if (customFactusol && customFactusol !== 'SUPERVISOR') {
                allItems.push({ type: 'Main', title: 'Factusol', username: customFactusol, password: passFactusol, owner });
            }
            if (row['EMAIL']) {
                allItems.push({ type: 'Main', title: 'Email', username: row['EMAIL'], password: passEmail, owner });
            }
            if (phoneNumLegacy) {
                allItems.push({ type: 'Main', title: 'Móvil (Legacy)', username: phoneNumLegacy, password: row['PIN'], owner });
            }
        }
    });

    // Process telefonos.csv (Phones)
    telefonosParsed.data.forEach(row => {
        const phoneName = row['Nombre'];
        const phoneNumFile = row['Teléfono'];
        const phoneCode = row['Código'];
        const phoneShort = row['Nombre corto'];

        if (phoneName && phoneNumFile) {
            const owner = cleanName(phoneName);
            allItems.push({
                type: 'Phone',
                title: 'Móvil Corporativo',
                username: phoneNumFile,
                password: phoneCode,
                owner,
                notes: phoneShort
            });
        }
    });

    console.log("\n--- IMPORT VERIFICATION RESULTS ---");
    console.log(`Total Items Found: ${allItems.length}`);

    // Group by owner to show unified view
    const byOwner = {};
    allItems.forEach(item => {
        if (!byOwner[item.owner]) byOwner[item.owner] = [];
        byOwner[item.owner].push(item);
    });

    Object.keys(byOwner).slice(0, 5).forEach(owner => {
        console.log(`\nUser: ${owner}`);
        byOwner[owner].forEach(item => {
            console.log(`  - [${item.type}] ${item.title}: ${item.username} / ${item.password || '(no pass)'}`);
        });
    });

    console.log(`\n... and ${Object.keys(byOwner).length - 5} more users.`);
};

processFiles();
