import { File, Paperclip, Trash2, Upload } from 'lucide-react';

import {
    formatAttachmentSize,
    MAX_ATTACHMENTS_PER_ITEM,
} from '../../lib/attachments';

export default function VaultAttachmentsField({
    existingAttachments = [],
    onRemoveExisting,
    onFilesSelected,
    pendingFiles = [],
    onRemovePending,
}) {
    const totalCount = existingAttachments.length + pendingFiles.length;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                    Adjuntos cifrados
                </label>
                <span className="text-xs text-slate-500">
                    {totalCount}/{MAX_ATTACHMENTS_PER_ITEM}
                </span>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-primary/50 hover:bg-slate-900">
                <Upload className="h-4 w-4 text-primary" />
                Anadir archivos
                <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        onFilesSelected(files);
                        event.target.value = '';
                    }}
                />
            </label>

            <p className="text-xs text-slate-500">
                PDF, TXT, CSV, imagenes o configuraciones. Maximo 5 MB por archivo.
            </p>

            {existingAttachments.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Guardados
                    </p>
                    {existingAttachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-white">{attachment.fileName}</p>
                                    <p className="text-xs text-slate-500">
                                        {formatAttachmentSize(attachment.sizeBytes)}
                                    </p>
                                </div>
                            </div>
                            {onRemoveExisting && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveExisting(attachment.id)}
                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400"
                                    title="Eliminar adjunto"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {pendingFiles.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pendientes de subir
                    </p>
                    {pendingFiles.map((file, index) => (
                        <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <File className="h-4 w-4 shrink-0 text-primary" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-white">{file.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {formatAttachmentSize(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemovePending(index)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400"
                                title="Quitar de la cola"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
