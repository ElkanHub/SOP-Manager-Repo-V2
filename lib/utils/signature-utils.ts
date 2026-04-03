/**
 * Shared utility for generating signature-style initials specimens.
 */

export const getInitialsString = (fullName: string): string => {
    if (!fullName) return "??."
    const parts = fullName.trim().split(' ').filter(Boolean)
    if (parts.length === 0) return "??."
    if (parts.length === 1) return parts[0][0].toUpperCase() + "."
    return parts.map(n => n[0].toUpperCase()).join('.') + '.'
}

export const generateInitialsBlob = (fullName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const initials = getInitialsString(fullName)
        const canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 150
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Use a high-quality cursive font stack
        // Dancing Script is one of the most reliable handwriting fonts if loaded via Google Fonts
        // Otherwise, falling back to a generic cursive stack
        ctx.font = "italic 70px 'Dancing Script', 'Sacramento', 'Cedarville Cursive', cursive"
        ctx.fillStyle = "black"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(initials, canvas.width / 2, canvas.height / 2)
        
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Failed to generate blob from canvas"))
        }, 'image/png')
    })
}
