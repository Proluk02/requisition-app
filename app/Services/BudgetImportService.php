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
        $project = Project::find($projectId);
        if (! $project) {
            throw new \Exception('Le projet sélectionné est introuvable.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();
        $rows = [];

        if (in_array($extension, ['xlsx', 'xls'], true)) {
            if (class_exists(IOFactory::class)) {
                $spreadsheet = IOFactory::load($path);
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray(null, true, true, false);
            } else {
                return [
                    'success' => false,
                    'message' => 'Veuillez enregistrer votre fichier au format .csv avant de l’importer.',
                    'imported' => 0,
                    'updated' => 0,
                    'errors' => ['Module PhpSpreadsheet absent. Utilisez le format .csv.'],
                ];
            }
        } elseif ($extension === 'csv' || $extension === 'txt') {
            $rows = $this->parseCsv($path);
        } else {
            return [
                'success' => false,
                'message' => 'Format non pris en charge. Formats acceptés : .xlsx, .xls et .csv.',
                'imported' => 0,
                'updated' => 0,
                'errors' => ['Format de fichier invalide.'],
            ];
        }

        if (empty($rows) || count($rows) < 2) {
            return [
                'success' => false,
                'message' => 'Le fichier est vide ou ne contient aucune ligne de données.',
                'imported' => 0,
                'updated' => 0,
                'errors' => ['Fichier vide.'],
            ];
        }

        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), array_shift($rows));
        $headerMap = $this->mapHeaders($headers);

        // Seules 3 colonnes sont strictement indispensables : CODE, DESCRIPTION et BALANCE
        $requiredHeaders = ['code', 'libelle', 'balance'];
        $missingHeaders = array_values(array_diff($requiredHeaders, array_keys($headerMap)));

        if ($missingHeaders !== []) {
            $headerNames = [
                'code' => 'CODE',
                'libelle' => 'DESCRIPTION (ou LIBELLE)',
                'balance' => 'BALANCE (ou BUDGET)',
            ];
            $missingNames = array_map(fn ($header) => $headerNames[$header], $missingHeaders);

            return [
                'success' => false,
                'message' => 'Colonnes obligatoires manquantes dans votre fichier : ' . implode(', ', $missingNames) . '.',
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

                $code = trim((string) $this->getValue($row, $headerMap['code'] ?? null));
                if (empty($code)) {
                    $errors[] = "Ligne {$rowNumber} ignorée : le code budgétaire est vide.";
                    continue;
                }

                $libelle = $this->getValue($row, $headerMap['libelle'] ?? null) ?: "Ligne budgétaire {$code}";

                // Devise : EUR par défaut conforme aux exigences SFP
                $rawDevise = $this->getValue($row, $headerMap['devise'] ?? null);
                $devise = ! empty($rawDevise) ? strtoupper(trim($rawDevise)) : 'EUR';
                if (! in_array($devise, ['EUR', 'USD', 'FC', 'CDF'], true)) {
                    $devise = 'EUR';
                }

                $rawBudget = $this->getValue($row, $headerMap['balance'] ?? null);
                $budgetInitial = $this->sanitizeAmount($rawBudget);

                // Donateur optionnel
                $donorName = $this->getValue($row, $headerMap['donor'] ?? null);
                $donorId = null;
                if (! empty($donorName)) {
                    $donor = Donor::firstOrCreate(
                        ['name' => trim($donorName)],
                        ['code' => strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $donorName), 0, 8))]
                    );
                    $donorId = $donor->id;
                }

                $existingLine = BudgetLine::where('code', $code)->where('project_id', $projectId)->first();

                if ($existingLine) {
                    $existingLine->update([
                        'donor_id' => $donorId ?: $existingLine->donor_id,
                        'libelle' => $libelle,
                        'devise' => $devise,
                        'budget_initial' => $budgetInitial,
                        'solde' => round($budgetInitial - (float) $existingLine->montant_decaisse, 2),
                    ]);
                    $updatedCount++;
                } else {
                    BudgetLine::create([
                        'project_id' => $projectId,
                        'donor_id' => $donorId,
                        'code' => $code,
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
                'message' => "Importation réussie : {$importedCount} ligne(s) créée(s), {$updatedCount} mise(s) à jour.",
                'imported' => $importedCount,
                'updated' => $updatedCount,
                'errors' => $errors,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();

            return [
                'success' => false,
                'message' => "Erreur lors de l'importation : " . $e->getMessage(),
                'imported' => 0,
                'updated' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    protected function parseCsv(string $path): array
    {
        $rows = [];
        if (! file_exists($path) || ! is_readable($path)) {
            return $rows;
        }

        $handle = fopen($path, 'r');
        if (! $handle) return $rows;

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

            if (in_array($clean, ['code', 'codebudget', 'codeligne'], true)) {
                $map['code'] = $index;
            } elseif (in_array($clean, ['description', 'libelle', 'intitule', 'activite'], true)) {
                $map['libelle'] = $index;
            } elseif (in_array($clean, ['balance', 'budget', 'budgetinitial', 'montant', 'solde'], true)) {
                $map['balance'] = $index;
            } elseif (in_array($clean, ['devise', 'currency', 'monnaie'], true)) {
                $map['devise'] = $index;
            } elseif (in_array($clean, ['donateur', 'donor', 'bailleur', 'partenaire'], true)) {
                $map['donor'] = $index;
            }
        }

        return $map;
    }

    protected function getValue(array $row, ?int $index): ?string
    {
        if ($index === null || ! isset($row[$index])) return null;
        $val = trim((string) $row[$index]);
        return $val !== '' ? $val : null;
    }

    protected function sanitizeAmount(?string $val): float
    {
        if (empty($val)) return 0.0;
        $clean = str_replace([' ', "\xc2\xa0", '$', 'FC', 'CDF', 'EUR', '€'], '', $val);
        $clean = str_replace(',', '.', $clean);
        return (float) $clean;
    }

    protected function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn ($cell) => filled($cell)));
    }
}