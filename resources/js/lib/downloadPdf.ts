interface PdfOptions {
    orientation?: 'portrait' | 'landscape';
    contentWidth?: string;
}

let exportSequence = 0;

function hasRenderedContent(canvas: HTMLCanvasElement): boolean {
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Unable to inspect the rendered PDF canvas.');
    }

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < data.length; index += 4) {
        if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) {
            return true;
        }
    }

    return false;
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

    const orientation = options.orientation ?? 'portrait';
    const width = options.contentWidth ?? (orientation === 'landscape' ? '277mm' : '190mm');
    const exportId = `pdf-export-${++exportSequence}`;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.setAttribute('data-pdf-export', exportId);
    clone.classList.remove('hidden');
    clone.style.setProperty('display', 'block', 'important');
    clone.style.setProperty('visibility', 'visible', 'important');
    clone.style.setProperty('position', 'absolute', 'important');
    clone.style.setProperty('top', '0', 'important');
    clone.style.setProperty('left', '0', 'important');
    clone.style.setProperty('width', width, 'important');
    clone.style.setProperty('height', 'auto', 'important');
    clone.style.setProperty('max-height', 'none', 'important');
    clone.style.setProperty('overflow', 'visible', 'important');
    clone.style.setProperty('opacity', '1', 'important');
    clone.style.setProperty('z-index', '2147483647', 'important');
    clone.style.setProperty('pointer-events', 'none', 'important');
    clone.style.setProperty('background-color', '#ffffff', 'important');
    clone.style.setProperty('color', '#000000', 'important');
    clone.querySelectorAll<HTMLElement>('.hidden').forEach((child) => child.classList.remove('hidden'));
    try {
        document.body.appendChild(clone);
        await document.fonts.ready;
        await Promise.all(Array.from(clone.querySelectorAll('img')).map((image) => image.decode()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const { width: renderedWidth, height: renderedHeight } = clone.getBoundingClientRect();
        if (renderedWidth === 0 || renderedHeight === 0) {
            throw new Error(`PDF content has no visible dimensions: #${elementId}`);
        }

        const { default: html2pdf } = await import('html2pdf.js');
        const worker = html2pdf()
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
                        const clonedElement = clonedDocument.querySelector<HTMLElement>(`[data-pdf-export="${exportId}"]`);
                        if (!clonedElement) {
                            throw new Error(`PDF export clone not found: ${exportId}`);
                        }

                        clonedElement.style.setProperty('display', 'block', 'important');
                        clonedElement.style.setProperty('visibility', 'visible', 'important');
                        clonedElement.style.setProperty('position', 'static', 'important');
                        clonedElement.style.setProperty('inset', 'auto', 'important');
                        clonedElement.style.setProperty('transform', 'none', 'important');
                        clonedElement.style.setProperty('left', 'auto', 'important');
                        clonedElement.style.setProperty('top', 'auto', 'important');
                        clonedElement.style.setProperty('width', width, 'important');
                        clonedElement.style.setProperty('height', 'auto', 'important');
                        clonedElement.style.setProperty('min-height', '0', 'important');
                        clonedElement.style.setProperty('max-height', 'none', 'important');
                        clonedElement.style.setProperty('margin', '0 auto', 'important');
                        clonedElement.style.setProperty('background-color', '#ffffff', 'important');
                        clonedElement.style.setProperty('z-index', 'auto', 'important');
                        clonedElement.style.setProperty('opacity', '1', 'important');

                        clonedElement.querySelectorAll<HTMLElement>('*').forEach((child) => {
                            child.style.setProperty('visibility', 'visible', 'important');
                            child.classList.remove('hidden');
                        });
                    },
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation },
            })
            .from(clone);

        await worker.toCanvas();
        const canvas = await worker.get('canvas') as HTMLCanvasElement;
        if (!hasRenderedContent(canvas)) {
            throw new Error(`PDF rendering produced an empty page: #${elementId}`);
        }

        await worker.toPdf().save();
    } catch (error) {
        console.error('PDF generation failed.', error);
        window.alert('La génération du PDF a échoué. Veuillez réessayer.');
    } finally {
        clone.remove();
    }
}
