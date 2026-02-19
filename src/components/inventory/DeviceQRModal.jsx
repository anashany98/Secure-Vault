import React from 'react';
import QRCode from 'react-qr-code';
import { X, Printer } from 'lucide-react';

import { useConfig } from '../../context/ConfigContext';

export default function DeviceQRModal({ device, onClose }) {
    const { config } = useConfig();
    if (!device) return null;

    const handlePrint = () => {
        window.print();
    };

    const qrValue = JSON.stringify({
        id: device.id,
        serial: device.serial_number,
        model: device.model,
        asset_tag: `ASSET-${device.id.slice(0, 8).toUpperCase()}`
    });

    const qrUrl = `${window.location.origin}/inventory/view/${device.id}`;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed">
            <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-auto">

                {/* Header (Hidden when printing) */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 print:hidden">
                    <h2 className="text-xl font-bold text-white">Etiqueta de Activo</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Printable Area - Optimized for 62x29mm */}
                <div className="p-8 flex flex-col items-center bg-white text-black printable-area">
                    <div className="flex items-center gap-2 w-full printable-border">
                        <div className="shrink-0">
                            <QRCode
                                value={qrUrl}
                                size={64} // Smaller QR
                                style={{ height: "auto", maxWidth: "100%", width: "22mm" }} // Fixed mm width
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden leading-tight">
                            <h3 className="font-bold text-[10px] uppercase truncate mb-0.5">{config?.company_name || 'Propiedad de Empresa'}</h3>
                            <p className="font-bold text-[11px] truncate leading-none mb-0.5">
                                {device.brand} {device.model}
                            </p>
                            <p className="text-[9px] font-mono text-gray-600 truncate mb-0.5">
                                ID: <span className="font-bold">{device.id.slice(0, 8).toUpperCase()}</span>
                            </p>
                            <p className="text-[8px] font-semibold text-gray-500 truncate">
                                SN: {device.serial_number || 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 text-center print:hidden">
                        <p className="text-sm text-gray-500 mb-4">
                            Esta etiqueta está diseñada para imprimirse en formato 3" x 2" o similar.
                        </p>
                    </div>
                </div>

                {/* Footer (Hidden when printing) */}
                <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3 print:hidden">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Printer className="w-5 h-5" />
                        Imprimir Etiqueta
                    </button>
                </div>
            </div>

            {/* Print Styles for Brother QL-700 (Compact 62mm x 29mm) */}
            <style>{`
                @media print {
                    @page {
                        size: 62mm 29mm;
                        margin: 0;
                    }
                    html, body {
                        width: 100%;
                        height: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible;
                    }
                    /* Use visibility hidden instead of display none so we can show children */
                    body * {
                        visibility: hidden;
                    }
                    /* Target the specific printable area and make it and its children visible */
                    .printable-area, .printable-area * {
                        visibility: visible !important;
                    }
                    .printable-area {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 62mm !important;
                        height: 29mm !important;
                        margin: 0 !important;
                        padding: 2mm 4mm !important; /* Some padding for label printers to avoid edge cut */
                        background: white !important;
                        z-index: 99999 !important;
                        
                        /* Layout */
                        display: flex !important;
                        flex-direction: row;
                        align-items: center;
                        gap: 6px;
                    }
                    
                    /* Hide everything else explicitly if needed, but visibility hidden usually catches all */
                    .fixed.inset-0 {
                        position: static !important;
                        background: none !important;
                        width: 0 !important;
                        height: 0 !important;
                        overflow: visible !important;
                    }
                    
                    .bg-surface {
                        display: none;
                    }

                    .printable-border {
                        border: none !important;
                        padding: 0 !important;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
