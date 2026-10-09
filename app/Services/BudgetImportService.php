<?php

namespace App\Services;

use App\Models\BudgetLine;
use App\Models\Donor;
use App\Models\Project;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use ZipArchive;

class BudgetImportService
{
    /**
     * Importe ou met à jour les lignes budgétaires à partir d'un fichier Excel (.xlsx, .xls) ou CSV.
     */
    public function import(UploadedFile $file, string $projectId): array
    {
        $project = Project::findOrFail($projectId);
        $extension = strtolower($file->getClientOriginalExtension());

        $rows = [];

        // 1. Décodage du fichier avec mécanismes de secours
        if ($extension === 'xlsx') {
            if (class_exists(ZipArchive::class)) {
                $rows = $this->parseXlsxNative($file->getRealPath());
            }

            if (empty($rows) && class_exists(IOFactory::class)) {
                $rows = $this->parsePhpSpreadsheet($file->getRealPath());
            }

            if (empty($rows) && PHP_OS_FAMILY === 'Windows') {
                $rows = $this->parseXlsxWindowsNative($file->getRealPath());
            }
        } elseif ($extension === 'xls') {
            if (class_exists(IOFactory::class)) {
                $rows = $this->parsePhpSpreadsheet($file->getRealPath());
            }
        } else {
            $rows = $this->parseCsv($file->getRealPath());
        }

        if (empty($rows) || count($rows) < 2) {
            return [
                'success' => false,
                'message' => 'Impossible de lire le fichier. Veuillez activer l’extension zip dans php.ini ou enregistrer votre feuille sous format CSV (.csv) dans Excel.',
                'imported' => 0,
                'updated' => 0,
                'errors' => ['Format illisible ou extension zip inactive dans php.ini.'],
            ];
        }

        // 2. Détection dynamique de la ligne d'en-tête
        [$headerMap, $dataRows] = $this->extractHeaderAndDataRows($rows);

        $importedCount = 0;
        $updatedCount = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($dataRows as $index => $row) {
                $rowNumber = $index + 2;

                if ($this->isEmptyRow($row)) {
                    continue;
                }

                $cat = $this->getValue($row, $headerMap['category_code'] ?? 0);
                $subcat = $this->getValue($row, $headerMap['subcategory_code'] ?? 1);
                $desc = $this->getValue($row, $headerMap['descript_code'] ?? 2);
                $split = $this->getValue($row, $headerMap['split_code'] ?? 3);
                $directCode = $this->getValue($row, $headerMap['code'] ?? 4);

                $code = $directCode ?: BudgetLine::buildCode($cat, $subcat, $desc, $split);
                $code = trim(preg_replace('/\s+/', '', (string) $code));

                if (empty($code)) {
                    $errors[] = "Ligne {$rowNumber} ignorée : code budgétaire absent.";
                    continue;
                }

                $libelle = $this->getValue($row, $headerMap['libelle'] ?? 5) ?: "Ligne {$code}";
                $devise = strtoupper((string) ($this->getValue($row, $headerMap['devise'] ?? 6) ?: 'USD'));
                if (! in_array($devise, ['USD', 'FC', 'EUR'], true)) {
                    $devise = 'USD';
                }

                $rawBudget = $this->getValue($row, $headerMap['budget_initial'] ?? 7);
                $budgetInitial = $this->sanitizeAmount($rawBudget);

                $donorName = $this->getValue($row, $headerMap['donor'] ?? 8);
                $donorId = null;

                if (! empty($donorName)) {
                    $donorNameClean = trim((string) $donorName);
                    $donor = Donor::firstOrCreate(
                        ['name' => $donorNameClean],
                        ['code' => strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $donorNameClean), 0, 8))]
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
                        'solde' => round($budgetInitial - (float) $existingLine->montant_decaisse, 2),
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
                'message' => "Importation réussie : {$importedCount} ligne(s) créée(s), {$updatedCount} mise(s) à jour pour le projet {$project->name}.",
                'imported' => $importedCount,
                'updated' => $updatedCount,
                'errors' => $errors,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();

            return [
                'success' => false,
                'message' => "Erreur lors de l'enregistrement : " . $e->getMessage(),
                'imported' => 0,
                'updated' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    /**
     * Lecteur natif via ZipArchive lorsque l'extension PHP est active.
     */
    protected function parseXlsxNative(string $filePath): array
    {
        if (! class_exists(ZipArchive::class)) {
            return [];
        }

        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            return [];
        }

        $sharedStrings = [];
        $stringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($stringsXml) {
            $xml = @simplexml_load_string($stringsXml);
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
        if (! $sheetXml) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/sheet') && str_ends_with($name, '.xml')) {
                    $sheetXml = $zip->getFromIndex($i);
                    break;
                }
            }
        }

        $zip->close();

        if (! $sheetXml) {
            return [];
        }

        return $this->parseSheetXmlString($sheetXml, $sharedStrings);
    }

    /**
     * Secours natif Windows : utilise tar.exe de Windows 10/11 pour extraire le XLSX sans extension PHP.
     */
    protected function parseXlsxWindowsNative(string $filePath): array
    {
        $tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'xlsx_' . uniqid();
        if (! @mkdir($tempDir) && ! is_dir($tempDir)) {
            return [];
        }

        $cmd = 'tar -xf ' . escapeshellarg($filePath) . ' -C ' . escapeshellarg($tempDir) . ' 2>NUL';
        @exec($cmd);

        $stringsPath = $tempDir . DIRECTORY_SEPARATOR . 'xl' . DIRECTORY_SEPARATOR . 'sharedStrings.xml';
        $sheetPath = $tempDir . DIRECTORY_SEPARATOR . 'xl' . DIRECTORY_SEPARATOR . 'worksheets' . DIRECTORY_SEPARATOR . 'sheet1.xml';

        $sharedStrings = [];
        if (file_exists($stringsPath)) {
            $xml = @simplexml_load_file($stringsPath);
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

        $rows = [];
        if (file_exists($sheetPath)) {
            $sheetXml = file_get_contents($sheetPath);
            if ($sheetXml) {
                $rows = $this->parseSheetXmlString($sheetXml, $sharedStrings);
            }
        }

        // Nettoyage du dossier temporaire
        $this->deleteDirectory($tempDir);

        return $rows;
    }

    /**
     * Analyse le contenu XML de la feuille et associe les chaînes partagées.
     */
    protected function parseSheetXmlString(string $sheetXml, array $sharedStrings): array
    {
        $sheet = @simplexml_load_string($sheetXml);
        if (! $sheet || ! isset($sheet->sheetData)) {
            return [];
        }

        $rows = [];
        foreach ($sheet->sheetData->row as $row) {
            $rowData = [];
            $maxColIndex = 0;

            foreach ($row->c as $cell) {
                $ref = (string) $cell['r'];
                preg_match('/^([A-Z]+)(\d+)$/', $ref, $matches);
                $colLetters = $matches[1] ?? 'A';
                $colIndex = $this->columnLetterToIndex($colLetters);

                $type = (string) $cell['t'];
                $val = isset($cell->v) ? (string) $cell->v : '';

                if ($type === 's') {
                    $val = $sharedStrings[(int) $val] ?? '';
                } elseif ($type === 'inlineStr' && isset($cell->is->t)) {
                    $val = (string) $cell->is->t;
                }

                $rowData[$colIndex] = $val;
                if ($colIndex > $maxColIndex) {
                    $maxColIndex = $colIndex;
                }
            }

            $fullRow = [];
            for ($c = 0; $c <= $maxColIndex; $c++) {
                $fullRow[$c] = $rowData[$c] ?? '';
            }

            if (! empty(array_filter($fullRow, fn ($v) => trim((string) $v) !== ''))) {
                $rows[] = $fullRow;
            }
        }

        return $rows;
    }

    protected function columnLetterToIndex(string $letters): int
    {
        $letters = strtoupper(trim($letters));
        $index = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($letters[$i]) - ord('A') + 1);
        }
        return $index - 1;
    }

    protected function parsePhpSpreadsheet(string $path): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
            $worksheet = $spreadsheet->getActiveSheet();
            return $worksheet->toArray(null, true, false, false);
        } catch (\Throwable) {
            return [];
        }
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
        $delimiter = str_contains((string) $firstLine, ';') ? ';' : ',';

        while (($data = fgetcsv($handle, 4096, $delimiter)) !== false) {
            $rows[] = $data;
        }
        fclose($handle);

        return $rows;
    }

    protected function extractHeaderAndDataRows(array $rows): array
    {
        $headerRowIndex = 0;

        foreach ($rows as $index => $row) {
            foreach ($row as $cell) {
                $clean = strtolower(trim((string) $cell));
                if (
                    str_contains($clean, 'code') ||
                    str_contains($clean, 'libelle') ||
                    str_contains($clean, 'categor') ||
                    str_contains($clean, 'budget')
                ) {
                    $headerRowIndex = $index;
                    break 2;
                }
            }
        }

        $headerCells = $rows[$headerRowIndex] ?? [];
        $dataRows = array_slice($rows, $headerRowIndex + 1);

        $map = [];
        foreach ($headerCells as $colIndex => $cellValue) {
            $clean = preg_replace('/[^a-z0-9]/', '', strtolower(trim((string) $cellValue)));

            if (in_array($clean, ['code', 'codebudget', 'codebudgetaire', 'codeligne', 'imputation'], true)) {
                $map['code'] = $colIndex;
            } elseif (str_contains($clean, 'subcat') || str_contains($clean, 'souscat')) {
                $map['subcategory_code'] = $colIndex;
            } elseif (str_contains($clean, 'cat')) {
                $map['category_code'] = $colIndex;
            } elseif (str_contains($clean, 'desc')) {
                $map['descript_code'] = $colIndex;
            } elseif (str_contains($clean, 'split') || str_contains($clean, 'div')) {
                $map['split_code'] = $colIndex;
            } elseif (str_contains($clean, 'libel') || str_contains($clean, 'intitul') || str_contains($clean, 'activit')) {
                $map['libelle'] = $colIndex;
            } elseif (str_contains($clean, 'budget') || str_contains($clean, 'montant') || str_contains($clean, 'allou')) {
                $map['budget_initial'] = $colIndex;
            } elseif (str_contains($clean, 'devise') || str_contains($clean, 'curr') || str_contains($clean, 'monn')) {
                $map['devise'] = $colIndex;
            } elseif (str_contains($clean, 'donat') || str_contains($clean, 'donor') || str_contains($clean, 'baill')) {
                $map['donor'] = $colIndex;
            }
        }

        $map['category_code'] ??= 0;
        $map['subcategory_code'] ??= 1;
        $map['descript_code'] ??= 2;
        $map['split_code'] ??= 3;
        $map['code'] ??= 4;
        $map['libelle'] ??= 5;
        $map['devise'] ??= 6;
        $map['budget_initial'] ??= 7;
        $map['donor'] ??= 8;

        return [$map, $dataRows];
    }

    protected function getValue(array $row, ?int $index): ?string
    {
        if ($index === null || ! isset($row[$index])) {
            return null;
        }

        $val = trim((string) $row[$index]);
        return $val !== '' ? $val : null;
    }

    protected function sanitizeAmount(mixed $val): float
    {
        if ($val === null || $val === '') {
            return 0.0;
        }

        if (is_numeric($val)) {
            return (float) $val;
        }

        $str = (string) $val;
        $str = preg_replace('/[\s\x{00A0}\x{202F}\x{2009}]+/u', '', $str);
        $str = str_replace(',', '.', (string) $str);
        $str = preg_replace('/[^0-9.-]/', '', (string) $str);

        return is_numeric($str) ? (float) $str : 0.0;
    }

    protected function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn ($cell) => trim((string) $cell) !== ''));
    }

    protected function deleteDirectory(string $dir): void
    {
        if (! file_exists($dir)) {
            return;
        }
        $files = array_diff(scandir($dir) ?: [], ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->deleteDirectory($path) : @unlink($path);
        }
        @rmdir($dir);
    }
}