/**
 * Converts a base64 data URL to a Blob without using fetch().
 *
 * Browsers with strict Content-Security-Policy may block `fetch(dataURL)`.
 * This manual conversion bypasses that restriction entirely.
 *
 * @param dataUrl - A base64-encoded data URL (e.g. "data:image/png;base64,iVBOR...")
 * @returns A Blob containing the decoded binary data
 */
export function base64ToBlob(dataUrl: string): Blob {
    // Split the data URL into metadata and payload
    const [header, base64Data] = dataUrl.split(',')

    if (!header || !base64Data) {
        throw new Error('Invalid data URL format')
    }

    // Extract MIME type from the header (e.g. "data:image/png;base64")
    const mimeMatch = header.match(/data:([^;]+)/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'

    // Decode base64 to binary string
    const binaryString = atob(base64Data)

    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    return new Blob([bytes], { type: mimeType })
}
