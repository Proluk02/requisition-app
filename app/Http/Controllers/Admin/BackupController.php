<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class BackupController extends Controller
{
    /**
     * Génère et télécharge un dump SQL complet de la base de données MySQL.
     */
    public function download(): Response
    {
        $databaseName = config('database.connections.mysql.database');
        $tables = DB::select('SHOW TABLES');
        $keyName = 'Tables_in_'.$databaseName;

        $sqlDump = "-- ============================================================\n";
        $sqlDump .= "-- RMS BON PASTEUR ASBL - SAUVEGARDE INTEGRALE DE LA BASE\n";
        $sqlDump .= '-- Date : '.now()->toIso8601String()."\n";
        $sqlDump .= '-- Base de données : '.$databaseName."\n";
        $sqlDump .= "-- ============================================================\n\n";
        $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $tableObj) {
            $table = $tableObj->$keyName;

            $createTableStmt = DB::select("SHOW CREATE TABLE `{$table}`");
            $sqlDump .= "-- Structure de la table `{$table}`\n";
            $sqlDump .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $sqlDump .= $createTableStmt[0]->{'Create Table'}.";\n\n";

            $rows = DB::table($table)->get();
            if ($rows->count() > 0) {
                $sqlDump .= "-- Données de la table `{$table}`\n";
                foreach ($rows as $row) {
                    $rowArray = (array) $row;
                    $escapedValues = array_map(function ($val) {
                        if ($val === null) {
                            return 'NULL';
                        }

                        return "'".addslashes((string) $val)."'";
                    }, array_values($rowArray));

                    $columns = array_map(fn ($c) => "`{$c}`", array_keys($rowArray));
                    $sqlDump .= "INSERT INTO `{$table}` (".implode(', ', $columns).') VALUES ('.implode(', ', $escapedValues).");\n";
                }
                $sqlDump .= "\n";
            }
        }

        $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";

        $fileName = 'backup_rms_bon_pasteur_'.now()->format('Y_m_d_His').'.sql';

        return response($sqlDump, 200, [
            'Content-Type' => 'application/sql',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }
}
