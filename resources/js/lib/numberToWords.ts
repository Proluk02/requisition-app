export function numberToWordsFR(amount: number, currency: 'USD' | 'FC' | 'EUR'): string {
    if (isNaN(amount) || amount <= 0) return 'Zéro';

    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

    function convertGroup(n: number): string {
        let str = '';
        const h = Math.floor(n / 100);
        const rem = n % 100;

        if (h > 0) {
            str += (h === 1 ? 'cent' : units[h] + ' cent') + ' ';
        }

        if (rem > 0) {
            if (rem < 10) {
                str += units[rem];
            } else if (rem < 20) {
                str += teens[rem - 10];
            } else {
                const t = Math.floor(rem / 10);
                const u = rem % 10;
                str += tens[t] + (u > 0 ? '-' + units[u] : '');
            }
        }
        return str.trim();
    }

    const integerPart = Math.floor(amount);
    let result = '';

    const billions = Math.floor(integerPart / 1_000_000_000);
    const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
    const remainder = integerPart % 1000;

    // Milliards
    if (billions > 0) {
        result += (billions === 1 ? 'un milliard' : convertGroup(billions) + ' milliards') + ' ';
    }

    // Millions
    if (millions > 0) {
        result += (millions === 1 ? 'un million' : convertGroup(millions) + ' millions') + ' ';
    }

    // Milliers
    if (thousands > 0) {
        result += (thousands === 1 ? 'mille' : convertGroup(thousands) + ' mille') + ' ';
    }

    // Reste (centaines / dizaines / unités)
    if (remainder > 0) {
        result += convertGroup(remainder);
    }

    result = result.trim();

    // Devise
    let currencyLabel = '';
    if (currency === 'USD') {
        currencyLabel = integerPart > 1 ? 'dollars américains' : 'dollar américain';
    } else if (currency === 'FC') {
        currencyLabel = integerPart > 1 ? 'francs congolais' : 'franc congolais';
    } else if (currency === 'EUR') {
        currencyLabel = integerPart > 1 ? 'euros' : 'euro';
    }

    return (result.charAt(0).toUpperCase() + result.slice(1)).trim() + ' ' + currencyLabel;
}