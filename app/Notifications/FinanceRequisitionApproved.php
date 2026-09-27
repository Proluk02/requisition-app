<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class FinanceRequisitionApproved extends Notification
{
    use Queueable;

    public function __construct(
        public string $requisitionId,
        public string $numero,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'titre' => 'Réquisition validée par Finance',
            'message' => "La réquisition {$this->numero} a été validée par Finance et transmise à l’étape suivante.",
            'requisition_id' => $this->requisitionId,
            'urgent' => false,
        ];
    }
}
