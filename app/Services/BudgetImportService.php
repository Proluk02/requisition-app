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
    /**
     * Importe ou met à jour les lignes budgétaires à partir d'un fichier Excel ou CSV.
     */
    public function import(UploadedFile $file, string $projectId): array
    {
        $project = Project::findOrFail($projectId);
        $extension = strtolower($file->getClientOriginalExtension());

        $rows = [];
        if (in_array($extension, ['xlsx', 'xls'], true)) {
            if (! class_exists(IOFactory::class)) {
                return [
                    'success' => false,
                    'message' => 'La lecture Excel n’est pas disponible sur le serveur.',
                    'imported' => 0,
                    'updated' => 0,
                    'errors' => ['PhpSpreadsheet est requis pour lire les fichiers Excel.'],
                ];
            }

            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray(null, true, true, false);
        } elseif ($extension === 'csv' || $extension === 'txt') {
            $rows = $this->parseCsv($file->getRealPath());
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
                'message' => 'Les colonnes obligatoires sont absentes : ' . implode(', ', $missingNames) . '.',
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
                        'solde' => round($budgetInitial - $existingLine->montant_engage - $existingLine->montant_decaisse, 2),
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

    /**
     * Lit un fichier CSV avec détection automatique du délimiteur.
     */
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

    /**
     * Associe les colonnes du tableau aux attributs RMS.
     */
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

        $clean = str_replace([' ', "\xc2\xa0", '$', 'FC', 'CDF'], '', $val);
        $clean = str_replace(',', '.', $clean);

        return (float) $clean;
    }

    protected function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn ($cell) => filled($cell)));
    }
}