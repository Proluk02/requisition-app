export async function openPrintPreview(elementId: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
        const error = new Error(`Print content not found: #${elementId}`);
        console.error(error);
        window.alert('Le document à imprimer est introuvable. Veuillez réessayer.');
        return;
    }

    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    window.print();
}
