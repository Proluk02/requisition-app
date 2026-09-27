<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class FinanceRequisitionRejected extends Notification
{
    use Queueable;

    public function __construct(
        public string $requisitionId,
        public string $numero,
        public string $motif,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'titre' => 'Réquisition à corriger',
            'message' => "La réquisition {$this->numero} a été renvoyée en brouillon par Finance. Motif : {$this->motif}",
            'requisition_id' => $this->requisitionId,
            'motif' => $this->motif,
            'urgent' => true,
        ];
    }
}
