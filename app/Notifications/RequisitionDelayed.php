<?php

namespace App\Notifications;

use App\Models\Requisition;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequisitionDelayed extends Notification
{
    use Queueable;

    public function __construct(
        public Requisition $requisition
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("URGENT - Retard de traitement : Réquisition {$this->requisition->numero_requisition}")
            ->error()
            ->greeting("Bonjour {$notifiable->name},")
            ->line("La réquisition **{$this->requisition->numero_requisition}** de {$this->requisition->user->name} est en attente de votre validation depuis plus de 48 heures.")
            ->line("Montant : **" . number_format($this->requisition->montant_total, 2, ',', ' ') . " {$this->requisition->devise}**")
            ->line("Merci de bien vouloir traiter ce dossier dans les plus brefs délais afin de ne pas bloquer les opérations.")
            ->action('Traiter la réquisition', route('dashboard'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'titre' => 'Retard d\'approbation (> 48h)',
            'message' => "La réquisition {$this->requisition->numero_requisition} est en attente de traitement depuis plus de 48 heures.",
            'urgent' => true,
        ];
    }
}