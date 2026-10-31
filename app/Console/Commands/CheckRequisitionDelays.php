<?php

namespace App\Console\Commands;

use App\Models\Requisition;
use App\Models\User;
use App\Notifications\RequisitionDelayed;
use Illuminate\Console\Command;

class CheckRequisitionDelays extends Command
{
    protected $signature = 'requisitions:check-delays';
    protected $description = 'Vérifie les réquisitions en attente depuis plus de 48h et alerte les validateurs.';

    public function handle()
    {
        $threshold = now()->subHours(48);

        $delayedRequisitions = Requisition::with('user')->whereNotIn('status', ['decaisse', 'cloture', 'rejetee'])
            ->where('updated_at', '<=', $threshold)
            ->get();

        $count = 0;

        foreach ($delayedRequisitions as $requisition) {
            $usersToNotify = $this->getPendingValidators($requisition);
            
            foreach ($usersToNotify as $user) {
                $user->notify(new RequisitionDelayed($requisition));
                $count++;
            }
        }

        $this->info("{$count} alertes de retard (48h) ont été envoyées.");
    }

    private function getPendingValidators(Requisition $requisition)
    {
        $status = $requisition->status;
        
        return match ($status) {
            'draft', 'returned_to_beneficiary', 'returned_to_urgent_initiator' => collect([$requisition->user]),
            
            'returned_to_project_manager', 'returned_to_finance', 'returned_to_admin_manager', 'visa_mp' => 
                User::role('project_manager')->where('project_id', $requisition->project_id)->get(),
                
            'visa_pam' => User::role('admin_manager')->get(),
            'controle_finance' => User::role('finance')->get(),
            'visa_admin', 'urgent_direction' => User::role('director')->get(),
            'decaissement_caisse' => User::role('cashier')->get(),
            default => collect([]),
        };
    }
}