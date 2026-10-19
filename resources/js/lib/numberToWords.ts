export type Currency = 'USD' | 'FC' | 'EUR';

interface CurrencyLabels {
    singular: string;
    plural: string;
    minorSingular: string;
    minorPlural: string;
}

const CURRENCY_LABELS: Record<Currency, CurrencyLabels> = {
    USD: {
        singular: 'dollar américain',
        plural: 'dollars américains',
        minorSingular: 'cent',
        minorPlural: 'cents',
    },
    FC: {
        singular: 'franc congolais',
        plural: 'francs congolais',
        minorSingular: 'centime',
        minorPlural: 'centimes',
    },
    EUR: {
        singular: 'euro',
        plural: 'euros',
        minorSingular: 'centime',
        minorPlural: 'centimes',
    },
};

const UNITS = [
    'zéro',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
];

const TEENS = [
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
    'dix-sept',
    'dix-huit',
    'dix-neuf',
];

const TENS = [
    '',
    '',
    'vingt',
    'trente',
    'quarante',
    'cinquante',
    'soixante',
];

const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Convertit un entier compris entre 0 et 99.
 *
 * beforeMille permet de gérer :
 * - quatre-vingts
 * - quatre-vingt mille
 */
function convertBelow100(n: number, beforeMille = false): string {
    if (n < 10) {
        return UNITS[n]!;
    }

    if (n < 20) {
        return TEENS[n - 10]!;
    }

    if (n < 70) {
        const ten = Math.floor(n / 10);
        const unit = n % 10;
        const tenLabel = TENS[ten]!;

        if (unit === 0) {
            return tenLabel;
        }

        if (unit === 1) {
            return `${tenLabel} et un`;
        }

        return `${tenLabel}-${UNITS[unit]!}`;
    }

    // 70 à 79 : soixante + dix à dix-neuf.
    if (n < 80) {
        if (n === 71) {
            return 'soixante et onze';
        }

        return `soixante-${convertBelow100(n - 60)}`;
    }

    if (n === 80) {
        return beforeMille ? 'quatre-vingt' : 'quatre-vingts';
    }

    // 81 à 99 : quatre-vingt + un à dix-neuf.
    return `quatre-vingt-${convertBelow100(n - 80)}`;
}

/**
 * Convertit un entier compris entre 0 et 999.
 *
 * Exemples :
 * - 200 : deux cents
 * - 201 : deux cent un
 * - 200 devant mille : deux cent
 */
function convertGroup(n: number, beforeMille = false): string {
    if (n < 100) {
        return convertBelow100(n, beforeMille);
    }

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    let result = hundreds === 1
        ? 'cent'
        : `${UNITS[hundreds]!} cent`;

    if (hundreds > 1 && remainder === 0 && !beforeMille) {
        result += 's';
    }

    if (remainder > 0) {
        result += ` ${convertBelow100(remainder, beforeMille)}`;
    }

    return result;
}

/**
 * Convertit un entier positif inférieur à 1 000 milliards.
 */
function convertInteger(n: number): string {
    if (n === 0) {
        return 'zéro';
    }

    const parts: string[] = [];

    const scales = [
        {
            value: 1_000_000_000,
            singular: 'milliard',
            plural: 'milliards',
        },
        {
            value: 1_000_000,
            singular: 'million',
            plural: 'millions',
        },
        {
            value: 1_000,
            singular: 'mille',
            plural: 'mille',
        },
    ];

    let remaining = n;

    for (const scale of scales) {
        const group = Math.floor(remaining / scale.value);
        remaining %= scale.value;

        if (group === 0) {
            continue;
        }

        if (scale.value === 1_000) {
            parts.push(
                group === 1
                    ? 'mille'
                    : `${convertGroup(group, true)} mille`
            );

            continue;
        }

        const scaleLabel = group === 1
            ? scale.singular
            : scale.plural;

        parts.push(`${convertGroup(group)} ${scaleLabel}`);
    }

    if (remaining > 0) {
        parts.push(convertGroup(remaining));
    }

    return parts.join(' ');
}

/**
 * Convertit un montant en lettres françaises avec sa devise.
 *
 * - Devises : USD, FC, EUR.
 * - Montants positifs ou nuls.
 * - Arrondi à deux décimales.
 * - Les décimales nulles ne sont pas affichées.
 * - Les valeurs invalides déclenchent une erreur.
 *
 * @example
 * numberToWordsFR(832875, 'USD');
 * // "Huit cent trente-deux mille huit cent soixante-quinze dollars américains"
 *
 * @example
 * numberToWordsFR(832875.50, 'USD');
 * // "Huit cent trente-deux mille huit cent soixante-quinze dollars américains et cinquante cents"
 *
 * @example
 * numberToWordsFR(1000000, 'EUR');
 * // "Un million d'euros"
 */
export function numberToWordsFR(
    amount: number,
    currency: Currency
): string {
    if (!Number.isFinite(amount)) {
        throw new RangeError('Le montant doit être un nombre fini.');
    }

    if (amount < 0) {
        throw new RangeError('Le montant ne peut pas être négatif.');
    }

    if (amount >= MAX_AMOUNT) {
        throw new RangeError(
            'Le montant doit être inférieur à 1 000 milliards.'
        );
    }

    // Vérification utile si la devise provient de données externes.
    if (!Object.prototype.hasOwnProperty.call(CURRENCY_LABELS, currency)) {
        throw new RangeError(
            'Devise non prise en charge. Valeurs acceptées : USD, FC, EUR.'
        );
    }

    // Arrondir avant de séparer les parties pour gérer les retenues.
    const totalMinorUnits = Math.round(
        (amount + Number.EPSILON) * 100
    );

    const integerPart = Math.floor(totalMinorUnits / 100);
    const decimalPart = totalMinorUnits % 100;

    if (integerPart >= MAX_AMOUNT) {
        throw new RangeError(
            'Le montant arrondi doit être inférieur à 1 000 milliards.'
        );
    }

    const labels = CURRENCY_LABELS[currency];

    const currencyLabel = integerPart > 1
        ? labels.plural
        : labels.singular;

    // Un million de dollars, mais un million d'euros.
    const needsDe = (
        integerPart >= 1_000_000 &&
        integerPart % 1_000_000 === 0
    );

    const connector = needsDe
        ? (currency === 'EUR' ? " d'" : ' de ')
        : ' ';

    let result =
        convertInteger(integerPart) + connector + currencyLabel;

    if (decimalPart > 0) {
        const minorLabel = decimalPart > 1
            ? labels.minorPlural
            : labels.minorSingular;

        result += ` et ${convertInteger(decimalPart)} ${minorLabel}`;
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
}