import { getVaultKey } from './env';
import { decryptStringWithKey, encryptStringWithKey } from './secretCrypto';

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_ITEM = 10;

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
        reader.readAsDataURL(file);
    });
}

export function formatAttachmentSize(sizeBytes = 0) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return '0 B';
    }

    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateAttachmentFile(file) {
    if (!file) {
        throw new Error('Archivo no valido');
    }

    if (file.size <= 0) {
        throw new Error(`${file.name} esta vacio`);
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new Error(`${file.name} supera el limite de 5 MB`);
    }
}

export async function buildEncryptedAttachmentPayload(file) {
    validateAttachmentFile(file);

    const dataUrl = await readFileAsDataUrl(file);
    return {
        encrypted_data: encryptStringWithKey(dataUrl, getVaultKey()),
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
    };
}

export function decryptAttachmentDataUrl(encryptedData) {
    return decryptStringWithKey(encryptedData, getVaultKey());
}

export function downloadEncryptedAttachment(attachment) {
    const dataUrl = decryptAttachmentDataUrl(attachment.encryptedData ?? attachment.encrypted_data);
    if (!dataUrl) {
        throw new Error('No se pudo desencriptar el adjunto');
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = attachment.fileName ?? attachment.file_name ?? 'adjunto';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
