<?php

namespace App\Services;

use App\Models\BudgetLine;
use App\Models\Donor;
use App\Models\Project;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class BudgetImportService
{
    public function import(UploadedFile $file, string $projectId): array
    {
        $project = Project::findOrFail($projectId);
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();

        $rows = [];

        if (in_array($extension, ['xlsx', 'xls'], true)) {
            if (class_exists(IOFactory::class)) {
                $spreadsheet = IOFactory::load($path);
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray(null, true, true, false);
            } 
            elseif ($extension === 'xlsx') {
                $rows = $this->parseXlsxNative($path);
                if (empty($rows)) {
                    return [
                        'success' => false,
                        'message' => 'Impossible de lire le fichier .xlsx. convertissez le fichier en .csv.',
                        'imported' => 0,
                        'updated' => 0,
                        'errors' => ['Lecture du fichier .xlsx impossible.'],
                    ];
                }
            } else {
                return [
                    'success' => false,
                    'message' => 'Pour le format ancien .xls, veuillez enregistrer votre fichier au format .xlsx ou .csv avant de l’importer.',
                    'imported' => 0,
                    'updated' => 0,
                    'errors' => ['Format .xls binaire non pris en charge'],
                ];
            }
        } elseif ($extension === 'csv' || $extension === 'txt') {
            $rows = $this->parseCsv($path);
        } else {
            return [
                'success' => false,
                'message' => 'Le format du fichier n’est pas pris en charge.',
                'imported' => 0,
                'updated' => 0,
                'errors' => ['Formats acceptés : .xlsx, .xls, .csv et .txt.'],
            ];
        }

        if (empty($rows) || count($rows) < 2) {
            return [
                'success' => false,
                'message' => 'Le fichier est vide ou ne contient aucune ligne de données.',
                'imported' => 0,
                'updated' => 0,
                'errors' => ['Format de fichier invalide ou vide.'],
            ];
        }

        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), array_shift($rows));
        $headerMap = $this->mapHeaders($headers);
        $requiredHeaders = [
            'category_code',
            'subcategory_code',
            'descript_code',
            'split_code',
            'code',
            'libelle',
            'devise',
            'budget_initial',
            'donor',
        ];
        $missingHeaders = array_values(array_diff($requiredHeaders, array_keys($headerMap)));

        if ($missingHeaders !== []) {
            $headerNames = [
                'category_code' => 'CATEGORY',
                'subcategory_code' => 'SUBCATEGORY',
                'descript_code' => 'DESCRIPT',
                'split_code' => 'SPLIT',
                'code' => 'CODE',
                'libelle' => 'LIBELLE',
                'devise' => 'DEVISE',
                'budget_initial' => 'BUDGET_INITIAL',
                'donor' => 'DONATEUR',
            ];
            $missingNames = array_map(fn ($header) => $headerNames[$header], $missingHeaders);

            return [
                'success' => false,
                'message' => 'Les colonnes obligatoires suivantes sont absentes : ' . implode(', ', $missingNames) . '.',
                'imported' => 0,
                'updated' => 0,
                'errors' => $missingNames,
            ];
        }

        $importedCount = 0;
        $updatedCount = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;

                if ($this->isEmptyRow($row)) {
                    continue;
                }

                $cat = $this->getValue($row, $headerMap['category_code'] ?? null);
                $subcat = $this->getValue($row, $headerMap['subcategory_code'] ?? null);
                $desc = $this->getValue($row, $headerMap['descript_code'] ?? null);
                $split = $this->getValue($row, $headerMap['split_code'] ?? null);
                $directCode = $this->getValue($row, $headerMap['code'] ?? null);

                $code = $directCode ?: BudgetLine::buildCode($cat, $subcat, $desc, $split);

                if (empty($code)) {
                    $errors[] = "Ligne {$rowNumber} ignorée : impossible de déterminer le code budgétaire.";
                    continue;
                }

                $libelle = $this->getValue($row, $headerMap['libelle'] ?? null) ?: "Ligne budgétaire {$code}";
                $devise = strtoupper($this->getValue($row, $headerMap['devise'] ?? null) ?: 'USD');
                if (! in_array($devise, ['USD', 'FC', 'EUR'], true)) {
                    $devise = 'USD';
                }

                $rawBudget = $this->getValue($row, $headerMap['budget_initial'] ?? null);
                $budgetInitial = $this->sanitizeAmount($rawBudget);

                $donorName = $this->getValue($row, $headerMap['donor'] ?? null);
                $donorId = null;
                if (! empty($donorName)) {
                    $donor = Donor::firstOrCreate(
                        ['name' => trim($donorName)],
                        ['code' => strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $donorName), 0, 8))]
                    );
                    $donorId = $donor->id;
                }

                $existingLine = BudgetLine::where('project_id', $project->id)
                    ->where('code', $code)
                    ->first();

                if ($existingLine) {
                    $existingLine->update([
                        'donor_id' => $donorId ?: $existingLine->donor_id,
                        'category_code' => $cat ?: $existingLine->category_code,
                        'subcategory_code' => $subcat ?: $existingLine->subcategory_code,
                        'descript_code' => $desc ?: $existingLine->descript_code,
                        'split_code' => $split ?: $existingLine->split_code,
                        'libelle' => $libelle,
                        'devise' => $devise,
                        'budget_initial' => $budgetInitial,
                        'solde' => round($budgetInitial - (float) $existingLine->montant_engage, 2),
                    ]);
                    $updatedCount++;
                } else {
                    BudgetLine::create([
                        'project_id' => $project->id,
                        'donor_id' => $donorId,
                        'code' => $code,
                        'category_code' => $cat,
                        'subcategory_code' => $subcat,
                        'descript_code' => $desc,
                        'split_code' => $split,
                        'libelle' => $libelle,
                        'devise' => $devise,
                        'budget_initial' => $budgetInitial,
                        'montant_engage' => 0,
                        'montant_decaisse' => 0,
                        'solde' => $budgetInitial,
                    ]);
                    $importedCount++;
                }
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Importation terminée : {$importedCount} ligne(s) créée(s), {$updatedCount} mise(s) à jour.",
                'imported' => $importedCount,
                'updated' => $updatedCount,
                'errors' => $errors,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();

            return [
                'success' => false,
                'message' => "Échec de l'importation : " . $e->getMessage(),
                'imported' => 0,
                'updated' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    protected function parseXlsxNative(string $path): array
    {
        if (! class_exists(\ZipArchive::class)) {
            return [];
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return [];
        }

        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml !== false) {
            $xml = simplexml_load_string($sharedStringsXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            $text .= (string) $r->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/sheet') && str_ends_with($name, '.xml')) {
                    $sheetXml = $zip->getFromName($name);
                    break;
                }
            }
        }

        $zip->close();

        if (! $sheetXml) {
            return [];
        }

        $xml = simplexml_load_string($sheetXml);
        if (! $xml || ! isset($xml->sheetData->row)) {
            return [];
        }

        $rows = [];
        foreach ($xml->sheetData->row as $row) {
            $rowData = [];
            $lastColIndex = -1;

            foreach ($row->c as $c) {
                $ref = (string) $c['r'];
                preg_match('/^([A-Z]+)/', $ref, $matches);
                $colLetter = $matches[1] ?? 'A';
                $colIndex = $this->columnLetterToIndex($colLetter);

                while ($lastColIndex + 1 < $colIndex) {
                    $rowData[] = null;
                    $lastColIndex++;
                }

                $type = (string) $c['t'];
                $val = isset($c->v) ? (string) $c->v : '';

                if ($type === 's' && isset($sharedStrings[(int) $val])) {
                    $cellValue = $sharedStrings[(int) $val];
                } elseif ($type === 'inlineStr' && isset($c->is->t)) {
                    $cellValue = (string) $c->is->t;
                } else {
                    $cellValue = $val;
                }

                $rowData[] = $cellValue;
                $lastColIndex = $colIndex;
            }

            $rows[] = $rowData;
        }

        return $rows;
    }

    protected function columnLetterToIndex(string $col): int
    {
        $index = 0;
        $length = strlen($col);
        for ($i = 0; $i < $length; $i++) {
            $index = $index * 26 + (ord($col[$i]) - 64);
        }
        return $index - 1;
    }

    protected function parseCsv(string $path): array
    {
        $rows = [];
        if (! file_exists($path) || ! is_readable($path)) {
            return $rows;
        }

        $handle = fopen($path, 'r');
        if (! $handle) {
            return $rows;
        }

        $firstLine = fgets($handle);
        rewind($handle);
        $delimiter = str_contains($firstLine, ';') ? ';' : ',';

        while (($data = fgetcsv($handle, 4096, $delimiter)) !== false) {
            $rows[] = $data;
        }
        fclose($handle);

        return $rows;
    }

    protected function mapHeaders(array $headers): array
    {
        $map = [];

        foreach ($headers as $index => $header) {
            $clean = preg_replace('/[^a-z0-9]/', '', strtolower(ltrim($header, "\xEF\xBB\xBF")));

            if (in_array($clean, ['code', 'codebudget', 'codebudgetaire', 'codeligne'], true)) {
                $map['code'] = $index;
            } elseif (in_array($clean, ['category', 'categorycode', 'cat', 'codecat'], true)) {
                $map['category_code'] = $index;
            } elseif (in_array($clean, ['subcategory', 'subcategorycode', 'subcat', 'codesubcat'], true)) {
                $map['subcategory_code'] = $index;
            } elseif (in_array($clean, ['descript', 'descriptcode', 'desc', 'codedesc'], true)) {
                $map['descript_code'] = $index;
            } elseif (in_array($clean, ['split', 'splitcode', 'codesplit'], true)) {
                $map['split_code'] = $index;
            } elseif (in_array($clean, ['libelle', 'description', 'intitule', 'activite', 'ligne'], true)) {
                $map['libelle'] = $index;
            } elseif (in_array($clean, ['budget', 'budgetinitial', 'montant', 'initial', 'alloue'], true)) {
                $map['budget_initial'] = $index;
            } elseif (in_array($clean, ['devise', 'currency', 'monnaie'], true)) {
                $map['devise'] = $index;
            } elseif (in_array($clean, ['donor', 'donateur', 'bailleur', 'partenaire'], true)) {
                $map['donor'] = $index;
            }
        }

        return $map;
    }

    protected function getValue(array $row, ?int $index): ?string
    {
        if ($index === null || ! isset($row[$index])) {
            return null;
        }

        $val = trim((string) $row[$index]);
        return $val !== '' ? $val : null;
    }

    protected function sanitizeAmount(?string $val): float
    {
        if (empty($val)) {
            return 0.0;
        }

        $clean = str_replace([' ', "\xc2\xa0", '$', 'FC', 'CDF', 'EUR', '€'], '', $val);
        $clean = str_replace(',', '.', $clean);

        return (float) $clean;
    }

    protected function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn ($cell) => filled($cell)));
    }
}