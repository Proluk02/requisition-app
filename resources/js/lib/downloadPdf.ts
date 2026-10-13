interface PdfOptions {
    orientation?: 'portrait' | 'landscape';
    contentWidth?: string;
}

export async function downloadPdf(elementId: string, fileName: string, options: PdfOptions = {}) {
    const safeFileName = fileName
        .replace(/[<>:"\\|?*\u0000-\u001f]/g, '-')
        .replace(/\//g, '-')
        .replace(/\.pdf$/i, '');
    const element = document.getElementById(elementId);
    if (!element) {
        const error = new Error(`PDF content not found: #${elementId}`);
        console.error(error);
        window.alert('Le document à convertir en PDF est introuvable. Veuillez réessayer.');
        return;
    }

    const originalStyle = element.getAttribute('style');
    element.style.setProperty('display', 'block', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.style.setProperty('width', options.contentWidth ?? (options.orientation === 'landscape' ? '277mm' : '190mm'), 'important');

    try {
        const { default: html2pdf } = await import('html2pdf.js');
        const orientation = options.orientation ?? 'portrait';
        await html2pdf()
            .set({
                margin: orientation === 'landscape' ? [8, 10, 8, 10] : [10, 10, 10, 10],
                filename: `${safeFileName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                enableLinks: true,
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDocument: Document) => {
                        const clonedElement = clonedDocument.getElementById(elementId);
                        if (!clonedElement) return;

                        clonedElement.style.setProperty('display', 'block', 'important');
                        clonedElement.style.setProperty('visibility', 'visible', 'important');
                        clonedElement.style.setProperty('position', 'static', 'important');
                        clonedElement.style.setProperty('inset', 'auto', 'important');
                        clonedElement.style.setProperty('transform', 'none', 'important');
                        clonedElement.style.setProperty('left', 'auto', 'important');
                        clonedElement.style.setProperty('top', 'auto', 'important');
                        clonedElement.style.setProperty('width', options.contentWidth ?? (orientation === 'landscape' ? '277mm' : '190mm'), 'important');
                        clonedElement.style.setProperty('height', 'auto', 'important');
                        clonedElement.style.setProperty('min-height', '0', 'important');
                        clonedElement.style.setProperty('max-height', 'none', 'important');
                        clonedElement.style.setProperty('margin', '0 auto', 'important');
                        clonedElement.style.setProperty('background-color', '#ffffff', 'important');
                        clonedElement.style.setProperty('z-index', 'auto', 'important');
                        clonedElement.style.setProperty('opacity', '1', 'important');

                        clonedElement.querySelectorAll<HTMLElement>('*').forEach((child) => {
                            child.style.setProperty('visibility', 'visible', 'important');
                        });
                    },
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation },
            })
            .from(element)
            .save();
    } catch (error) {
        console.error('PDF generation failed.', error);
        window.alert('La génération du PDF a échoué. Veuillez réessayer.');
    } finally {
        if (originalStyle === null) {
            element.removeAttribute('style');
        } else {
            element.setAttribute('style', originalStyle);
        }
    }
}
