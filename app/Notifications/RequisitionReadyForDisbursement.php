<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequisitionReadyForDisbursement extends Notification
{
    public function __construct(
        public string $numero,
        public float $montant,
        public string $devise,
        public ?string $caisse,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Réquisition {$this->numero} prête pour le décaissement")
            ->view('emails.requisitions.ready-for-disbursement', [
                'initiatorName' => $notifiable->name,
                'numero' => $this->numero,
                'montant' => number_format($this->montant, 2, ',', ' '),
                'devise' => $this->devise,
                'caisse' => $this->caisse,
                'requisitionsUrl' => route('requisitions.index'),
            ]);
    }
}
